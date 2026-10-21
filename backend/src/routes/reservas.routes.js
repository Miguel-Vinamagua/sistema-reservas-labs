const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authorization');
const { createReservation } = require('../services/reserva.service');

const router = express.Router();

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.statusCode
        ? error.message
        : 'No se pudo crear la reserva.'
    }
  });
}

router.post('/', authenticate, authorizeRoles('estudiante', 'docente'), async (req, res) => {
  try {
    const reservation = await createReservation({
      laboratorioId: req.body?.laboratorioId,
      inicio: req.body?.inicio,
      fin: req.body?.fin,
      usuarioId: req.auth.userId
    });

    return res.status(201).json({ data: reservation });
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;