const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authorization');
const {
  createSession,
  listAvailableSessions,
  listOwnSessions
} = require('../controllers/sesiones.controller');

const router = express.Router();

router.get(
  '/mias',
  authenticate,
  authorizeRoles('docente'),
  listOwnSessions
);
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
