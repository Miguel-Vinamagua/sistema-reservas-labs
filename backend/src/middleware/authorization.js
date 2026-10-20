const jwt = require('jsonwebtoken');

const validRoles = ['estudiante', 'docente', 'administrador'];

function authenticate(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    return res.status(500).json({
      error: {
        code: 'AUTH_CONFIGURATION_ERROR',
        message: 'El servicio de autenticación no está configurado.'
      }
    });
  }

  const authorization = req.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Se requiere autenticación.' }
    });
  }

  try {
    const payload = jwt.verify(match[1], secret);
    if (
      typeof payload.sub !== 'string' ||
      !validRoles.includes(payload.rol)
    ) {
      throw new Error('Invalid authentication claims.');
    }

    req.auth = { userId: payload.sub, role: payload.rol };
    return next();
  } catch {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'El token no es válido o ha expirado.' }
    });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'No tiene permisos para esta operación.' }
      });
    }

    return next();
  };
}

module.exports = { authenticate, authorizeRoles };
