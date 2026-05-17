// src/utils/jwtUtils.js
// REEMPLAZO completo del archivo existente.
// Añade soporte para "token temporal 2FA" (entre login y verify-2fa).
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_2FA_PENDING_EXPIRES_IN = process.env.JWT_2FA_PENDING_EXPIRES_IN || '5m';

/**
 * JWT de sesión normal.
 * payload típico: { id_usuario, id_rol, rol_name }
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Token corto, NO sirve como sesión.
 * Solo se usa entre POST /auth/login (cuando 2FA está activo) y POST /auth/2fa/verify.
 * Se identifica por el claim twofa_pending = true.
 */
function signTwoFAPendingToken(id_usuario) {
  return jwt.sign(
    { id_usuario, twofa_pending: true },
    JWT_SECRET,
    { expiresIn: JWT_2FA_PENDING_EXPIRES_IN }
  );
}

function verifyTwoFAPendingToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.twofa_pending !== true) {
    throw new Error('Token no es un token 2FA pendiente');
  }
  return payload; // { id_usuario, twofa_pending, iat, exp }
}

module.exports = {
  signToken,
  verifyToken,
  signTwoFAPendingToken,
  verifyTwoFAPendingToken,
};
