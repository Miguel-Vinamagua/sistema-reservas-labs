const mongoose = require('mongoose');
const Laboratorio = require('../models/laboratorio.model');

function serviceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toPublicLaboratory(laboratory, includeStatus) {
  const result = {
    id: laboratory._id.toString(),
    nombre: laboratory.nombre,
    capacidad: laboratory.capacidad,
    ubicacion: laboratory.ubicacion
  };

  if (includeStatus) {
    result.activo = laboratory.activo;
  }

  return result;
}

function toObjectId(id) {
  if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) {
    throw serviceError(400, 'VALIDATION_ERROR', 'El identificador del laboratorio no es válido.');
  }

  return new mongoose.Types.ObjectId(id);
}

async function getLaboratories(role) {
  const isAdministrator = role === 'administrador';
  const filter = isAdministrator ? {} : { activo: true };
  const laboratories = await Laboratorio.find(filter)
    .sort({ nombre: 1, _id: 1 })
    .lean();

  return laboratories.map((laboratory) => (
    toPublicLaboratory(laboratory, isAdministrator)
  ));
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

module.exports = { getLaboratories, getLaboratoryById, serviceError };