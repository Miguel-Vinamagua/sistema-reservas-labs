const {
  cancelOwnReservation,
  createReservation,
  getOwnReservations
} = require('../services/reserva.service');

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.statusCode
        ? error.message
        : 'No se pudo completar la operación de reservas.'
    }
  });
}

async function listOwnReservations(req, res) {
  try {
    const reservations = await getOwnReservations(req.auth.userId);
    return res.status(200).json({ data: reservations });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createOwnReservation(req, res) {
  try {
    const reservation = await createReservation({
      sesionLaboratorioId: req.body?.sesionLaboratorioId,
      usuarioId: req.auth.userId
    });
    return res.status(201).json({ data: reservation });
  } catch (error) {
    return sendError(res, error);
  }
}

async function cancelOwnReservationController(req, res) {
  try {
    const reservation = await cancelOwnReservation(req.params.id, req.auth.userId);
    return res.status(200).json({ data: reservation });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  cancelOwnReservation: cancelOwnReservationController,
  createOwnReservation,
  listOwnReservations
};
