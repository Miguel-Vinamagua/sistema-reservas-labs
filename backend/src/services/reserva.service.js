const mongoose = require('mongoose');
const Reserva = require('../models/reserva.model');
const SesionLaboratorio = require('../models/sesion-laboratorio.model');
const Laboratorio = require('../models/laboratorio.model');
const Usuario = require('../models/usuario.model');
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
  const teacher = laboratorySession?.docente;
  const effectiveState = reservation.estado === 'activa' &&
    laboratorySession?.fin <= new Date()
    ? 'finalizada'
    : reservation.estado;

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
    docente: teacher
      ? {
        id: teacher._id.toString(),
        correo: teacher.correo
      }
      : null,
    materia: laboratorySession?.materia ?? null,
    actividad: laboratorySession?.actividad ?? null,
    fecha: laboratorySession?.fecha?.toISOString() ?? null,
    inicio: laboratorySession?.inicio?.toISOString() ?? null,
    fin: laboratorySession?.fin?.toISOString() ?? null,
    capacidadMax: laboratorySession?.cupos ?? null,
    inscritosCount: laboratorySession?.inscritosCount ?? null,
    estado: effectiveState
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
      populate: [
        { path: 'laboratorio', select: 'nombre ubicacion' },
        { path: 'docente', select: 'correo' }
      ]
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
      if (laboratorySession.fin <= new Date()) {
        throw serviceError(
          409,
          'RESERVATION_NOT_CANCELLABLE',
          'No se puede cancelar una reserva cuya sesión ya terminó.'
        );
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

  // 1. Verificamos y actualizamos si la sesión ya expiró FUERA de la transacción principal
  // para asegurarnos de que el cambio a 'finalizada' se guarde permanentemente en la BD.
  const preliminarySession = await SesionLaboratorio.findById(laboratorySessionId);
  if (!preliminarySession) {
    throw serviceError(404, 'LAB_SESSION_NOT_FOUND', 'No se encontró la sesión solicitada.');
  }
  if (preliminarySession.fin <= new Date()) {
    if (preliminarySession.estado === 'abierta' || preliminarySession.estado === 'llena') {
      preliminarySession.estado = 'finalizada';
      await preliminarySession.save();
    }
    throw serviceError(400, 'LAB_SESSION_ENDED', 'La sesión ya terminó y no admite reservas.');
  }

  const session = await mongoose.startSession();
  let createdReservation;

  try {
    await session.withTransaction(async () => {
      const laboratorySession = await SesionLaboratorio.findById(laboratorySessionId)
        .session(session);
      
      if (!laboratorySession) {
        throw serviceError(404, 'LAB_SESSION_NOT_FOUND', 'No se encontró la sesión solicitada.');
      }
      if (laboratorySession.estado === 'cancelada' || laboratorySession.estado === 'finalizada') {
        throw serviceError(400, 'LAB_SESSION_NOT_AVAILABLE', 'La sesión cancelada o finalizada no admite reservas.');
      }
      if (laboratorySession.estado === 'llena') {
        throw serviceError(409, 'LAB_SESSION_FULL', 'La sesión alcanzó su capacidad máxima.');
      }
      if (laboratorySession.estado !== 'abierta') {
        throw serviceError(400, 'LAB_SESSION_NOT_AVAILABLE', 'La sesión no está disponible para reservas.');
      }
      if (laboratorySession.inscritosCount >= laboratorySession.cupos) {
        throw serviceError(409, 'LAB_SESSION_FULL', 'La sesión alcanzó su capacidad máxima.');
      }

      const studentGuard = await Usuario.updateOne(
        { _id: userObjectId },
        { $inc: { reservationRevision: 1 } },
        { session }
      );
      if (studentGuard.matchedCount !== 1) {
        throw serviceError(404, 'STUDENT_NOT_FOUND', 'No se encontró el estudiante autenticado.');
      }

      const existingReservation = await Reserva.exists({
        sesionLaboratorio: laboratorySessionId,
        usuario: userObjectId,
        estado: 'activa'
      }).session(session);
      if (existingReservation) {
        throw serviceError(
          409,
          'RESERVATION_DUPLICATE',
          'Ya tienes una reserva activa para esta sesión.'
        );
      }

      const activeReservations = await Reserva.find({
        usuario: userObjectId,
        estado: 'activa'
      })
        .populate({
          path: 'sesionLaboratorio',
          select: 'inicio fin'
        })
        .session(session)
        .lean();

      const conflictingSession = activeReservations.find(({ sesionLaboratorio: s }) => {
        if (!s) return false;
        return s.inicio < laboratorySession.fin && s.fin > laboratorySession.inicio;
      });

      if (conflictingSession) {
        throw serviceError(
          409,
          'RESERVATION_TIME_CONFLICT',
          'El horario se solapa con otra reserva activa tuya.'
        );
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
  } catch (error) {
    if (error.code === 11000) {
      throw serviceError(
        409,
        'RESERVATION_DUPLICATE',
        'Ya tienes una reserva activa para esta sesión.'
      );
    }
    throw error;
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
