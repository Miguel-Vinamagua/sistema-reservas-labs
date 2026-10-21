const mongoose = require('mongoose');
const Reserva = require('../models/reserva.model');
const Laboratorio = require('../models/laboratorio.model');
const { getLaboratoryById, serviceError } = require('./laboratorio.service');

const universityTimeZone = 'America/Bogota';
const universityDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: universityTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function parseDateTime(value, fieldName) {
  if (typeof value !== 'string') {
    throw serviceError(400, 'VALIDATION_ERROR', `${fieldName} debe ser una fecha ISO 8601 con zona horaria.`);
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) {
    throw serviceError(400, 'VALIDATION_ERROR', `${fieldName} debe ser una fecha ISO 8601 con zona horaria.`);
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', , offset] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offsetMatch = offset === 'Z' ? null : offset.slice(1).split(':').map(Number);

  if (
    year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth ||
    hour > 23 || minute > 59 || second > 59 ||
    (offsetMatch && (offsetMatch[0] > 23 || offsetMatch[1] > 59))
  ) {
    throw serviceError(400, 'VALIDATION_ERROR', `${fieldName} no es una fecha válida.`);
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw serviceError(400, 'VALIDATION_ERROR', `${fieldName} no es una fecha válida.`);
  }

  return new Date(timestamp);
}

function universityLocalDate(date) {
  const parts = universityDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function serializeReservation(reservation) {
  return {
    id: reservation._id.toString(),
    laboratorio: reservation.laboratorio.toString(),
    usuario: reservation.usuario.toString(),
    inicio: reservation.inicio.toISOString(),
    fin: reservation.fin.toISOString(),
    estado: reservation.estado
  };
}

async function createReservation({ laboratorioId, inicio, fin, usuarioId }) {
  if (typeof laboratorioId !== 'string' || !/^[a-f\d]{24}$/i.test(laboratorioId)) {
    throw serviceError(400, 'VALIDATION_ERROR', 'El identificador del laboratorio no es válido.');
  }
  if (typeof usuarioId !== 'string' || !mongoose.isValidObjectId(usuarioId)) {
    throw serviceError(400, 'VALIDATION_ERROR', 'El usuario autenticado no es válido.');
  }

  const start = parseDateTime(inicio, 'inicio');
  const end = parseDateTime(fin, 'fin');
  if (end <= start) {
    throw serviceError(400, 'VALIDATION_ERROR', 'La fecha de fin debe ser posterior a la fecha de inicio.');
  }

  const todayInUniversity = universityLocalDate(new Date());
  if (universityLocalDate(start) < todayInUniversity) {
    throw serviceError(400, 'VALIDATION_ERROR', 'No se permiten reservas en fechas pasadas.');
  }

  const laboratoryObjectId = new mongoose.Types.ObjectId(laboratorioId);
  const userObjectId = new mongoose.Types.ObjectId(usuarioId);
  const session = await mongoose.startSession();
  let createdReservation;

  try {
    await session.withTransaction(async () => {
      const guardResult = await Laboratorio.updateOne(
        { _id: laboratoryObjectId, activo: true },
        { $inc: { reservationRevision: 1 } },
        { session }
      );

      if (guardResult.matchedCount !== 1) {
        await getLaboratoryById(laboratorioId, session);
        throw serviceError(409, 'LABORATORY_INACTIVE', 'El laboratorio no está activo para nuevas reservas.');
      }

      const overlappingReservation = await Reserva.findOne({
        laboratorio: laboratoryObjectId,
        estado: 'activa',
        inicio: { $lt: end },
        fin: { $gt: start }
      })
        .select('_id')
        .session(session)
        .lean();

      if (overlappingReservation) {
        throw serviceError(409, 'RESERVATION_CONFLICT', 'El laboratorio ya tiene una reserva en ese horario.');
      }

      const [reservation] = await Reserva.create([{
        laboratorio: laboratoryObjectId,
        usuario: userObjectId,
        inicio: start,
        fin: end,
        estado: 'activa'
      }], { session });

      createdReservation = serializeReservation(reservation);
    });
  } finally {
    await session.endSession();
  }

  return createdReservation;
}

module.exports = { createReservation, parseDateTime, universityLocalDate };