const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authorization');
const { listMaterias } = require('../controllers/materias.controller');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('docente'), listMaterias);

module.exports = router;
