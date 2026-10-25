const mongoose = require('mongoose');
const Laboratorio = require('../models/laboratorio.model');
const SesionLaboratorio = require('../models/sesion-laboratorio.model');

function serviceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toPublicLaboratory(laboratory, includeStatus, occupied, occupiedUntil = null) {
  const result = {
    id: laboratory._id.toString(),
    nombre: laboratory.nombre,
    capacidad: laboratory.capacidad,
    ubicacion: laboratory.ubicacion
  };

  if (includeStatus) {
    result.activo = laboratory.activo;
  }

  if (typeof occupied === 'boolean') {
    result.ocupado = occupied;
    result.ocupadoHasta = occupiedUntil;
  }

  return result;
}

async function finalizeExpiredSessions(now = new Date()) {
  await SesionLaboratorio.updateMany(
    {
      estado: { $in: ['abierta', 'llena'] },
      fin: { $lt: now }
    },
    { $set: { estado: 'finalizada' } }
  );
}

function toObjectId(id) {
  if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) {
    throw serviceError(400, 'VALIDATION_ERROR', 'El identificador del laboratorio no es válido.');
  }

  return new mongoose.Types.ObjectId(id);
}

function validateLaboratoryFields(fields, allowPartial) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw serviceError(400, 'VALIDATION_ERROR', 'Los datos del laboratorio no son válidos.');
  }

  const allowedFields = ['nombre', 'capacidad', 'ubicacion'];
  const fieldNames = Object.keys(fields);
  if (
    fieldNames.some((field) => !allowedFields.includes(field)) ||
    (!allowPartial && allowedFields.some((field) => !fieldNames.includes(field))) ||
    (allowPartial && fieldNames.length === 0)
  ) {
    throw serviceError(400, 'VALIDATION_ERROR', 'Debe proporcionar únicamente campos válidos del laboratorio.');
  }

  const validated = {};
  if (Object.hasOwn(fields, 'nombre')) {
    if (typeof fields.nombre !== 'string' || !fields.nombre.trim()) {
      throw serviceError(400, 'VALIDATION_ERROR', 'El nombre no puede estar vacío.');
    }
    validated.nombre = fields.nombre.trim();
  }

  if (Object.hasOwn(fields, 'capacidad')) {
    if (!Number.isInteger(fields.capacidad) || fields.capacidad <= 0) {
      throw serviceError(400, 'VALIDATION_ERROR', 'La capacidad debe ser un entero positivo.');
    }
    validated.capacidad = fields.capacidad;
  }

  if (Object.hasOwn(fields, 'ubicacion')) {
    if (typeof fields.ubicacion !== 'string' || !fields.ubicacion.trim()) {
      throw serviceError(400, 'VALIDATION_ERROR', 'La ubicación no puede estar vacía.');
    }
    validated.ubicacion = fields.ubicacion.trim();
  }

  return validated;
}

async function createLaboratory(fields) {
  const validated = validateLaboratoryFields(fields, false);
  const laboratory = await Laboratorio.create(validated);
  return toPublicLaboratory(laboratory, true);
}

async function updateLaboratory(id, fields) {
  const objectId = toObjectId(id);
  const validated = validateLaboratoryFields(fields, true);
  const laboratory = await Laboratorio.findById(objectId);
  if (!laboratory) {
    throw serviceError(404, 'LABORATORY_NOT_FOUND', 'No se encontró el laboratorio solicitado.');
  }

  Object.assign(laboratory, validated);
  await laboratory.save();
  return toPublicLaboratory(laboratory, true);
}

async function deactivateLaboratory(id) {
  const laboratory = await getLaboratoryById(id);
  if (laboratory.activo) {
    laboratory.activo = false;
    await laboratory.save();
  }

  return toPublicLaboratory(laboratory, true);
}

async function getLaboratories(role) {
  const isAdministrator = role === 'administrador';
  const filter = isAdministrator ? {} : { activo: true };
  const now = new Date();
  await finalizeExpiredSessions(now);

  const laboratories = await Laboratorio.find(filter)
    .sort({ nombre: 1, _id: 1 })
    .lean();

  const activeSessions = await SesionLaboratorio.find({
    estado: { $in: ['abierta', 'llena'] },
    inicio: { $lte: now },
    fin: { $gte: now }
  })
    .select('laboratorio fin')
    .lean();
  const occupancyEndByLaboratory = new Map();
  for (const activeSession of activeSessions) {
    const laboratoryId = activeSession.laboratorio.toString();
    const currentEnd = occupancyEndByLaboratory.get(laboratoryId);
    if (!currentEnd || activeSession.fin > currentEnd) {
      occupancyEndByLaboratory.set(laboratoryId, activeSession.fin);
    }
  }

  return laboratories.map((laboratory) => {
    const occupancyEnd = occupancyEndByLaboratory.get(laboratory._id.toString());
    return toPublicLaboratory(
      laboratory,
      isAdministrator,
      Boolean(occupancyEnd),
      occupancyEnd?.toISOString() ?? null
    );
  });
}

async function getLaboratoryById(id, session) {
  const objectId = toObjectId(id);
  let query = Laboratorio.findById(objectId);
  if (session) {
    query = query.session(session);
  }

  const laboratory = await query;
  if (!laboratory) {
    throw serviceError(404, 'LABORATORY_NOT_FOUND', 'No se encontró el laboratorio solicitado.');
  }

  return laboratory;
}

module.exports = {
  createLaboratory,
  deactivateLaboratory,
  finalizeExpiredSessions,
  getLaboratories,
  getLaboratoryById,
  serviceError,
  updateLaboratory
};