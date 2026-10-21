const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authorization');
const {
  createLaboratory,
  deactivateLaboratory,
  getLaboratories,
  updateLaboratory
} = require('../services/laboratorio.service');

const router = express.Router();

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.statusCode
        ? error.message
        : 'No se pudo consultar el catálogo de laboratorios.'
    }
  });
}

router.get('/', authenticate, async (req, res) => {
  try {
    const laboratories = await getLaboratories(req.auth.role);
    return res.status(200).json({ data: laboratories });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/', authenticate, authorizeRoles('administrador'), async (req, res) => {
  try {
    const laboratory = await createLaboratory(req.body);
    return res.status(201).json({ data: laboratory });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id', authenticate, authorizeRoles('administrador'), async (req, res) => {
  try {
    const laboratory = await updateLaboratory(req.params.id, req.body);
    return res.status(200).json({ data: laboratory });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id/desactivar', authenticate, authorizeRoles('administrador'), async (req, res) => {
  try {
    const laboratory = await deactivateLaboratory(req.params.id);
    return res.status(200).json({ data: laboratory });
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;