const mongoose = require('mongoose');
const Reserva = require('../models/reserva.model');
const SesionLaboratorio = require('../models/sesion-laboratorio.model');
const Laboratorio = require('../models/laboratorio.model');
const { getLaboratoryById, serviceError } = require('./laboratorio.service');

function serializeReservation(reservation) {
  return {
    id: reservation._id.toString(),
    sesionLaboratorio: reservation.sesionLaboratorio.toString(),
    usuario: reservation.usuario.toString(),
    estado: reservation.estado
  };
}

function serializeOwnedReservation(reservation) {
  const laboratorySession = reservation.sesionLaboratorio;
  const laboratory = laboratorySession?.laboratorio;

  return {
    id: reservation._id.toString(),
    sesionLaboratorio: laboratorySession?._id.toString() ?? null,
    laboratorio: laboratory
      ? {
        id: laboratory._id.toString(),
        nombre: laboratory.nombre,
        ubicacion: laboratory.ubicacion
      }
      : null,
    materia: laboratorySession?.materia ?? null,
    actividad: laboratorySession?.actividad ?? null,
    inicio: laboratorySession?.inicio?.toISOString() ?? null,
    fin: laboratorySession?.fin?.toISOString() ?? null,
    estado: reservation.estado
  };
}

function toObjectId(value, fieldName) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throw serviceError(400, 'VALIDATION_ERROR', `${fieldName} no es válido.`);
  }

  return new mongoose.Types.ObjectId(value);
}

async function getOwnReservations(usuarioId) {
  const userObjectId = toObjectId(usuarioId, 'El usuario autenticado');
  const reservations = await Reserva.find({ usuario: userObjectId })
    .populate({
      path: 'sesionLaboratorio',
      populate: { path: 'laboratorio', select: 'nombre ubicacion' }
    })
    .sort({ _id: 1 })
    .lean();

  return reservations
    .sort((left, right) => {
      const leftStart = left.sesionLaboratorio?.inicio?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightStart = right.sesionLaboratorio?.inicio?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftStart - rightStart || left._id.toString().localeCompare(right._id.toString());
    })
    .map(serializeOwnedReservation);
}

async function cancelOwnReservation(reservationId, usuarioId) {
  const reservationObjectId = toObjectId(reservationId, 'El identificador de la reserva');
  const userObjectId = toObjectId(usuarioId, 'El usuario autenticado');
  const session = await mongoose.startSession();
  let cancelledReservation;

  try {
    await session.withTransaction(async () => {
      const reservation = await Reserva.findOneAndUpdate(
        {
          _id: reservationObjectId,
          usuario: userObjectId,
          estado: 'activa'
        },
        { $set: { estado: 'cancelada' } },
        { new: true, runValidators: true, session }
      );

      if (!reservation) {
        const existingReservation = await Reserva.findById(reservationObjectId)
          .select('usuario estado')
          .session(session)
          .lean();
        if (!existingReservation || !existingReservation.usuario.equals(userObjectId)) {
          throw serviceError(404, 'RESERVATION_NOT_FOUND', 'No se encontró la reserva solicitada.');
        }

        throw serviceError(409, 'RESERVATION_NOT_CANCELLABLE', 'La reserva ya no está activa.');
      }

      const laboratorySession = await SesionLaboratorio.findById(reservation.sesionLaboratorio)
        .session(session);
      if (!laboratorySession) {
        throw new Error('No se pudo actualizar el contador de inscritos de la sesión.');
      }

      if (laboratorySession.estado !== 'cancelada') {
        if (laboratorySession.inscritosCount < 1) {
          throw new Error('No se pudo actualizar el contador de inscritos de la sesión.');
        }

        laboratorySession.inscritosCount -= 1;
        if (laboratorySession.estado === 'llena') {
          laboratorySession.estado = 'abierta';
        }
        await laboratorySession.save({ session });
      }
      cancelledReservation = serializeReservation(reservation);
    });
  } finally {
    await session.endSession();
  }

  return cancelledReservation;
}

async function createReservation({ sesionLaboratorioId, usuarioId }) {
  const laboratorySessionId = toObjectId(
    sesionLaboratorioId,
    'El identificador de la sesión de laboratorio'
  );
  const userObjectId = toObjectId(usuarioId, 'El usuario autenticado');
  const session = await mongoose.startSession();
  let createdReservation;

  try {
    await session.withTransaction(async () => {
      const laboratorySession = await SesionLaboratorio.findById(laboratorySessionId)
        .session(session);
      if (!laboratorySession) {
        throw serviceError(404, 'LAB_SESSION_NOT_FOUND', 'No se encontró la sesión solicitada.');
      }
      if (laboratorySession.estado !== 'abierta') {
        throw serviceError(409, 'LAB_SESSION_NOT_AVAILABLE', 'La sesión no está disponible para reservas.');
      }
      if (laboratorySession.inscritosCount >= laboratorySession.cupos) {
        throw serviceError(409, 'LAB_SESSION_FULL', 'La sesión alcanzó su capacidad máxima.');
      }

      const laboratoryGuard = await Laboratorio.updateOne(
        { _id: laboratorySession.laboratorio, activo: true },
        { $inc: { reservationRevision: 1 } },
        { session }
      );

      if (laboratoryGuard.matchedCount !== 1) {
        await getLaboratoryById(laboratorySession.laboratorio.toString(), session);
        throw serviceError(409, 'LABORATORY_INACTIVE', 'El laboratorio no está activo para nuevas reservas.');
      }

      const updatedSession = await SesionLaboratorio.findOneAndUpdate(
        {
          _id: laboratorySessionId,
          estado: 'abierta',
          $expr: { $lt: ['$inscritosCount', '$cupos'] }
        },
        { $inc: { inscritosCount: 1 } },
        { new: true, runValidators: true, session }
      );

      if (!updatedSession) {
        throw serviceError(409, 'LAB_SESSION_FULL', 'La sesión alcanzó su capacidad máxima.');
      }
      if (updatedSession.inscritosCount >= updatedSession.cupos) {
        updatedSession.estado = 'llena';
        await updatedSession.save({ session });
      }

      const [reservation] = await Reserva.create([{
        sesionLaboratorio: laboratorySessionId,
        usuario: userObjectId,
        estado: 'activa'
      }], { session });

      createdReservation = serializeReservation(reservation);
    });
  } finally {
    await session.endSession();
  }

  return createdReservation;
}

module.exports = {
  cancelOwnReservation,
  createReservation,
  getOwnReservations
};
