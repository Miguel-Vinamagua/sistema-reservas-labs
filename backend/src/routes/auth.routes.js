const express = require('express');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { correo, password } = req.body || {};
  if (
    typeof correo !== 'string' ||
    !correo.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Debe proporcionar correo y contraseña.'
      }
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    return res.status(500).json({
      error: {
        code: 'AUTH_CONFIGURATION_ERROR',
        message: 'El servicio de autenticación no está configurado.'
      }
    });
  }

  try {
    const user = await Usuario.findOne({ correo: correo.trim().toLowerCase() })
      .select('+passwordHash');

    const matchesPassword = user
      ? await user.comparePassword(password)
      : await Usuario.comparePasswordDummy(password);
    if (!user || !matchesPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos.'
        }
      });
    }

    const token = jwt.sign(
      { rol: user.rol },
      secret,
      { subject: user._id.toString(), expiresIn: '1h' }
    );

    return res.status(200).json({
      data: {
        token,
        user: {
          id: user._id.toString(),
          correo: user.correo,
          rol: user.rol
        }
      }
    });
  } catch {
    return res.status(500).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'No se pudo completar la autenticación.'
      }
    });
  }
});

module.exports = router;
