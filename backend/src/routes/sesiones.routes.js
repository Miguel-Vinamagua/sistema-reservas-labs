const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authorization');
const {
  createSession,
  listAvailableSessions
} = require('../controllers/sesiones.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeRoles('estudiante', 'docente'),
  listAvailableSessions
);
router.post(
  '/',
  authenticate,
  authorizeRoles('docente'),
  createSession
);

module.exports = router;
