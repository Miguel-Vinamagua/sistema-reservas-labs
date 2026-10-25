const mongoose = require('mongoose');
const Materia = require('../models/materia.model');

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.statusCode
        ? error.message
        : 'No se pudo completar la operación de materias.'
    }
  });
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

async function listMaterias(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.auth.userId)) {
      throw validationError('El usuario autenticado no es válido.');
    }

    const materias = await Materia.find({ docente: req.auth.userId })
      .sort({ nombre: 1, _id: 1 })
      .lean();

    const data = materias.map((materia) => ({
      id: materia._id.toString(),
      nombre: materia.nombre,
      codigo: materia.codigo,
      docente: materia.docente.toString()
    }));

    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = { listMaterias };
