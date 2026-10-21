const express = require('express');
const { authenticate } = require('../middleware/authorization');
const { getLaboratories } = require('../services/laboratorio.service');

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

module.exports = router;