const mongoose = require('mongoose');
const Laboratorio = require('../models/laboratorio.model');
const SesionLaboratorio = require('../models/sesion-laboratorio.model');

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.statusCode
        ? error.message
        : 'No se pudo completar la operación de sesiones de laboratorio.'
    }
  });
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function serializeSession(laboratorySession, laboratory = null) {
  const laboratoryId = laboratorySession.laboratorio?._id ?? laboratorySession.laboratorio;

  return {
    id: laboratorySession._id.toString(),
    laboratorio: laboratory
      ? {
        id: laboratory._id.toString(),
        nombre: laboratory.nombre,
        ubicacion: laboratory.ubicacion
      }
      : laboratoryId.toString(),
    docente: laboratorySession.docente.toString(),
    materia: laboratorySession.materia,
    actividad: laboratorySession.actividad,
    inicio: laboratorySession.inicio.toISOString(),
    fin: laboratorySession.fin.toISOString(),
    capacidadMax: laboratorySession.capacidadMax,
    inscritosCount: laboratorySession.inscritosCount,
    estado: laboratorySession.estado
  };
}

async function createSession(req, res) {
  try {
    const { laboratorioId, materia, actividad, inicio, fin } = req.body ?? {};
    if (typeof laboratorioId !== 'string' || !mongoose.isValidObjectId(laboratorioId)) {
      throw validationError('El identificador del laboratorio no es válido.');
    }
    if (!mongoose.isValidObjectId(req.auth.userId)) {
      throw validationError('El usuario autenticado no es válido.');
    }
    if (typeof materia !== 'string' || !materia.trim()) {
      throw validationError('La materia es obligatoria.');
    }
    if (typeof actividad !== 'string' || !actividad.trim()) {
      throw validationError('La actividad es obligatoria.');
    }

    if (typeof inicio !== 'string' || typeof fin !== 'string') {
      throw validationError('Las fechas de inicio y fin son obligatorias.');
    }

    const start = new Date(inicio);
    const end = new Date(fin);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw validationError('Las fechas de inicio y fin deben ser válidas.');
    }
    if (end <= start) {
      throw validationError('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    const laboratory = await Laboratorio.findById(laboratorioId).select(
      'nombre ubicacion capacidad activo'
    );
    if (!laboratory) {
      const error = new Error('No se encontró el laboratorio solicitado.');
      error.statusCode = 404;
      error.code = 'LABORATORY_NOT_FOUND';
      throw error;
    }
    if (!laboratory.activo) {
      const error = new Error('El laboratorio no está activo para nuevas sesiones.');
      error.statusCode = 409;
      error.code = 'LABORATORY_INACTIVE';
      throw error;
    }

    const laboratorySession = await SesionLaboratorio.create({
      laboratorio: laboratory._id,
      docente: req.auth.userId,
      materia: materia.trim(),
      actividad: actividad.trim(),
      inicio: start,
      fin: end,
      capacidadMax: laboratory.capacidad,
      inscritosCount: 0,
      estado: 'disponible'
    });

    return res.status(201).json({
      data: serializeSession(laboratorySession, laboratory)
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function listAvailableSessions(_req, res) {
  try {
    const sessions = await SesionLaboratorio.find({ estado: 'disponible' })
      .populate('laboratorio', 'nombre ubicacion activo')
      .sort({ inicio: 1, _id: 1 })
      .lean();

    const availableSessions = sessions
      .filter((laboratorySession) => laboratorySession.laboratorio?.activo)
      .map((laboratorySession) => (
        serializeSession(laboratorySession, laboratorySession.laboratorio)
      ));

    return res.status(200).json({ data: availableSessions });
  } catch (error) {
    return sendError(res, error);
  }
}

async function listOwnSessions(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.auth.userId)) {
      throw validationError('El usuario autenticado no es válido.');
    }

    const sessions = await SesionLaboratorio.find({ docente: req.auth.userId })
      .populate('laboratorio', 'nombre ubicacion activo')
      .sort({ inicio: 1, _id: 1 })
      .lean();

    return res.status(200).json({
      data: sessions.map((laboratorySession) => (
        serializeSession(laboratorySession, laboratorySession.laboratorio)
      ))
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createSession,
  listAvailableSessions,
  listOwnSessions
};
