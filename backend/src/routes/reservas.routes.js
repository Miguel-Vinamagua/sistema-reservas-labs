const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authorization');
const {
  cancelOwnReservation,
  createOwnReservation,
  listOwnReservations
} = require('../controllers/reservas.controller');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('estudiante', 'docente'), listOwnReservations);
router.post('/', authenticate, authorizeRoles('estudiante', 'docente'), createOwnReservation);
router.patch(
  '/:id/cancelar',
  authenticate,
  authorizeRoles('estudiante', 'docente'),
  cancelOwnReservation
);

module.exports = router;