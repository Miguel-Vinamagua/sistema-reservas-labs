const mongoose = require('mongoose');
const Laboratorio = require('../models/laboratorio.model');
const Materia = require('../models/materia.model');
const SesionLaboratorio = require('../models/sesion-laboratorio.model');
require('../models/usuario.model');
const { finalizeExpiredSessions } = require('../services/laboratorio.service');

function sendError(res, error) {
  const isValidationError =
    error.name === 'ValidationError' || error.name === 'CastError';
  const statusCode = error.statusCode || (isValidationError ? 400 : 500);
  return res.status(statusCode).json({
    error: {
      code: error.code || (isValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR'),
      message: error.statusCode
        ? error.message
        : isValidationError
          ? error.message
          : 'No se pudo completar la operación de sesiones de laboratorio.'
    }
  });
}

function serializeDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function serializeSession(laboratorySession, laboratory = null) {
  const laboratoryReference = laboratorySession.laboratorio;
  const laboratoryId = laboratory?._id ?? laboratoryReference?._id ?? laboratoryReference;

  return {
    id: laboratorySession._id.toString(),
    laboratorio: laboratory
      ? {
        id: laboratory._id.toString(),
        nombre: laboratory.nombre,
        ubicacion: laboratory.ubicacion
      }
      : laboratoryId?.toString() ?? null,
    docente: laboratorySession.docente.toString(),
    materia: laboratorySession.materia,
    actividad: laboratorySession.actividad,
    fecha: serializeDate(laboratorySession.fecha),
    inicio: serializeDate(laboratorySession.inicio),
    fin: serializeDate(laboratorySession.fin),
    cupos: laboratorySession.cupos,
    inscritosCount: laboratorySession.inscritosCount,
    estado: laboratorySession.estado
  };
}

function serializeStudentSession(laboratorySession) {
  const laboratory = laboratorySession.laboratorio;
  const teacher = laboratorySession.docente;

  return {
    id: laboratorySession._id.toString(),
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
    materia: laboratorySession.materia,
    actividad: laboratorySession.actividad,
    fecha: serializeDate(laboratorySession.fecha),
    inicio: serializeDate(laboratorySession.inicio),
    fin: serializeDate(laboratorySession.fin),
    capacidadMax: laboratorySession.cupos,
    inscritosCount: laboratorySession.inscritosCount,
    estado: laboratorySession.estado === 'abierta'
      ? 'disponible'
      : laboratorySession.estado
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
    if (start.getTime() <= Date.now()) {
      throw validationError('La fecha de inicio no puede estar en el pasado.');
    }

    const databaseSession = await mongoose.startSession();
    let laboratory;
    let laboratorySession;

    try {
      await databaseSession.withTransaction(async () => {
        laboratory = await Laboratorio.findById(laboratorioId)
          .select('nombre ubicacion capacidad activo')
          .session(databaseSession);
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

        const lockResult = await Laboratorio.updateOne(
          { _id: laboratory._id, activo: true },
          { $inc: { reservationRevision: 1 } },
          { session: databaseSession }
        );
        if (lockResult.matchedCount !== 1) {
          const error = new Error('El laboratorio no está activo para nuevas sesiones.');
          error.statusCode = 409;
          error.code = 'LABORATORY_INACTIVE';
          throw error;
        }

        const materiaQuery = await Materia.findOne({
          nombre: materia.trim(),
          docente: req.auth.userId
        }).session(databaseSession);
        if (!materiaQuery) {
          throw validationError('La materia no está asociada al docente autenticado.');
        }

        const cupos = Object.hasOwn(req.body ?? {}, 'cupos')
          ? req.body.cupos
          : laboratory.capacidad;
        if (!Number.isInteger(cupos) || cupos < 1 || cupos > laboratory.capacidad) {
          throw validationError('Los cupos deben ser un entero entre 1 y la capacidad del laboratorio.');
        }

        const conflictingSession = await SesionLaboratorio.findOne({
          laboratorio: laboratory._id,
          estado: { $in: ['abierta', 'llena'] },
          inicio: { $lt: end },
          fin: { $gt: start }
        })
          .select('_id')
          .session(databaseSession);
        if (conflictingSession) {
          const error = new Error('El laboratorio ya tiene una sesión programada en ese horario.');
          error.statusCode = 409;
          error.code = 'SESSION_TIME_CONFLICT';
          throw error;
        }

        const fecha = new Date(Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate()
        ));
        [laboratorySession] = await SesionLaboratorio.create([{
          laboratorio: laboratory._id,
          docente: req.auth.userId,
          materia: materia.trim(),
          actividad: actividad.trim(),
          fecha,
          inicio: start,
          fin: end,
          cupos,
          inscritosCount: 0,
          estado: 'abierta'
        }], { session: databaseSession });
      });
    } finally {
      await databaseSession.endSession();
    }

    return res.status(201).json({
      data: serializeSession(laboratorySession, laboratory)
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function listAvailableSessions(req, res) {
  try {
    const now = new Date();
    await finalizeExpiredSessions(now);

    // 1. Si es un estudiante, buscamos las sesiones que YA tiene reservadas para excluirlas
    let reservedSessionIds = [];
    if (req.auth.role === 'estudiante') {
      const Reserva = require('../models/reserva.model'); // Asegúrate de que el nombre del modelo coincida con tu proyecto
      const studentReservations = await Reserva.find({
        estudiante: req.auth.userId,
        estado: 'activa'
      }).select('sesionLaboratorio').lean();
      
      reservedSessionIds = studentReservations.map((r) => r.sesionLaboratorio);
    }

    // 2. Buscamos las sesiones abiertas, con cupos, que NO estén en las reservas del estudiante
    const query = SesionLaboratorio.find({
      _id: { $nin: reservedSessionIds },
      estado: 'abierta',
      fin: { $gt: now },
      $expr: { $lt: ['$inscritosCount', '$cupos'] }
    })
      .populate('laboratorio', 'nombre ubicacion activo')
      .populate('docente', 'correo')
      .sort({ inicio: 1, _id: 1 });

    const sessions = await query.lean();

    if (req.auth.role === 'estudiante') {
      const availableSessions = sessions
        .filter((laboratorySession) => laboratorySession.laboratorio?.activo)
        .map(serializeStudentSession);

      return res.status(200).json({ data: availableSessions });
    }

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

async function listScheduleSessions(_req, res) {
  try {
    const now = new Date();
    const sessions = await SesionLaboratorio.find({
      estado: { $in: ['abierta', 'llena'] },
      fin: { $gt: now }
    })
      .populate('laboratorio', 'nombre ubicacion activo')
      .populate('docente', 'correo')
      .sort({ inicio: 1, _id: 1 })
      .lean();

    return res.status(200).json({
      data: sessions
        .filter((laboratorySession) => laboratorySession.laboratorio?.activo)
        .map(serializeStudentSession)
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function listOwnSessions(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.auth.userId)) {
      throw validationError('El usuario autenticado no es válido.');
    }

    await finalizeExpiredSessions();
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

async function cancelSession(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.auth.userId)) {
      throw validationError('El usuario autenticado no es válido.');
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw validationError('El identificador de la sesión no es válido.');
    }

    const laboratorySession = await SesionLaboratorio.findOne({
      _id: req.params.id,
      docente: req.auth.userId,
      estado: { $in: ['abierta', 'llena'] }
    }).populate('laboratorio', 'nombre ubicacion activo');

    if (!laboratorySession) {
      const error = new Error('No se encontró la sesión solicitada.');
      error.statusCode = 404;
      error.code = 'SESSION_NOT_FOUND';
      throw error;
    }

    laboratorySession.estado = 'cancelada';
    laboratorySession.inscritosCount = 0;
    await laboratorySession.save();

    const laboratory = laboratorySession.laboratorio;
    return res.status(200).json({
      data: serializeSession(laboratorySession, laboratory)
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  cancelSession,
  createSession,
  listAvailableSessions,
  listScheduleSessions,
  listOwnSessions
};
