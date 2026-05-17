// src/models/activationTokenModel.js
// Encapsula consultas sobre user_activation_tokens.
const db = require('../config/db');

const ACTIVATION_MINUTES = parseInt(process.env.ACTIVATION_TOKEN_MINUTES || '15', 10);

/**
 * Crea un registro de token de activación con expires_at = NOW() + N minutes.
 */
async function createToken({ id_usuario, token }, client = db) {
  const { rows } = await client.query(
    `INSERT INTO user_activation_tokens (id_usuario, token, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)
     RETURNING id_token, id_usuario, token, expires_at, used, created_at`,
    [id_usuario, token, String(ACTIVATION_MINUTES)]
  );
  return rows[0];
}

/**
 * Busca un token y devuelve también datos básicos del usuario.
 */
async function findByToken(token) {
  const { rows } = await db.query(
    `SELECT t.id_token, t.id_usuario, t.token, t.expires_at, t.used, t.created_at,
            u.email, u.estado
       FROM user_activation_tokens t
       JOIN usuarios u ON u.id_usuario = t.id_usuario
      WHERE t.token = $1
      LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function markUsed(id_token, client = db) {
  await client.query(
    `UPDATE user_activation_tokens
        SET used = TRUE
      WHERE id_token = $1`,
    [id_token]
  );
}

/**
 * Invalida todos los tokens previos del usuario (por si se re-genera).
 */
async function invalidateUserTokens(id_usuario, client = db) {
  await client.query(
    `UPDATE user_activation_tokens
        SET used = TRUE
      WHERE id_usuario = $1 AND used = FALSE`,
    [id_usuario]
  );
}

module.exports = {
  createToken,
  findByToken,
  markUsed,
  invalidateUserTokens,
};
