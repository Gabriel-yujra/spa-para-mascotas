// src/models/userModel.js
// REEMPLAZO completo del archivo existente.
// Cambios respecto a la versión anterior:
//   + Devuelve también failed_login_attempts, lock_until, fecha_creacion
//   + incrementFailedLoginAttempts / resetLoginAttempts
//   + setTwoFactorSecret / enableTwoFactor / disableTwoFactor
//   + activateUser / forceInactive
const db = require('../config/db');

const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10);
const LOCK_MINUTES = parseInt(process.env.LOGIN_LOCK_MINUTES || '15', 10);

async function findUserByEmail(email) {
  const { rows } = await db.query(
    `SELECT u.id_usuario, u.id_rol, u.nombre, u.email, u.password_hash,
            u.estado, u.two_factor_enabled, u.two_factor_secret,
            u.debe_cambiar_password, u.failed_login_attempts, u.lock_until,
            u.fecha_creacion,
            r.name AS rol_name
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.email = $1
      LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findUserWithRoleById(id_usuario) {
  const { rows } = await db.query(
    `SELECT u.id_usuario, u.id_rol, u.nombre, u.email, u.estado,
            u.debe_cambiar_password, u.two_factor_enabled,
            u.failed_login_attempts, u.lock_until, u.fecha_creacion,
            r.name AS rol_name
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1
      LIMIT 1`,
    [id_usuario]
  );
  return rows[0] || null;
}

async function findUserById(id_usuario) {
  const { rows } = await db.query(
    `SELECT id_usuario, id_rol, nombre, email, password_hash, estado,
            debe_cambiar_password, two_factor_enabled, two_factor_secret,
            failed_login_attempts, lock_until, fecha_creacion
       FROM usuarios
      WHERE id_usuario = $1
      LIMIT 1`,
    [id_usuario]
  );
  return rows[0] || null;
}

async function emailExists(email) {
  const { rows } = await db.query(
    'SELECT 1 FROM usuarios WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows.length > 0;
}

/**
 * Crea un usuario base. estado por defecto = 'activo' (compat).
 * Para registro de cliente con activación por correo, pasa estado='pendiente'.
 */
async function createUser(
  { id_rol, nombre, email, password_hash, debe_cambiar_password = false, estado = 'activo' },
  client = db
) {
  const { rows } = await client.query(
    `INSERT INTO usuarios
       (id_rol, nombre, email, password_hash, estado, debe_cambiar_password)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_usuario, id_rol, nombre, email, estado, debe_cambiar_password, fecha_creacion`,
    [id_rol, nombre, email, password_hash, estado, debe_cambiar_password]
  );
  return rows[0];
}

/**
 * Actualiza password y opcionalmente debe_cambiar_password y/o estado.
 * Útil para el primer cambio de contraseña de un empleado: pone estado='activo'.
 */
async function updatePassword(id_usuario, password_hash, debe_cambiar_password = false, estado = null) {
  if (estado) {
    const { rows } = await db.query(
      `UPDATE usuarios
          SET password_hash = $1,
              debe_cambiar_password = $2,
              estado = $3
        WHERE id_usuario = $4
        RETURNING id_usuario, estado`,
      [password_hash, debe_cambiar_password, estado, id_usuario]
    );
    return rows[0] || null;
  }
  const { rows } = await db.query(
    `UPDATE usuarios
        SET password_hash = $1,
            debe_cambiar_password = $2
      WHERE id_usuario = $3
      RETURNING id_usuario`,
    [password_hash, debe_cambiar_password, id_usuario]
  );
  return rows[0] || null;
}

async function updateLoginInfo(id_usuario, ip, userAgent) {
  await db.query(
    `UPDATE usuarios
        SET ultimo_acceso = NOW(),
            ip_ultimo_acceso = $1,
            user_agent = $2
      WHERE id_usuario = $3`,
    [ip, userAgent, id_usuario]
  );
}

async function updateUserEstado(id_usuario, estado) {
  const { rows } = await db.query(
    `UPDATE usuarios
        SET estado = $1
      WHERE id_usuario = $2
      RETURNING id_usuario, estado`,
    [estado, id_usuario]
  );
  return rows[0] || null;
}

// ============================================================
// Bloqueo por intentos fallidos
// ============================================================

/**
 * Incrementa el contador de intentos fallidos.
 * Si alcanza MAX_ATTEMPTS, fija lock_until = NOW() + LOCK_MINUTES.
 * Devuelve { failed_login_attempts, lock_until, locked }.
 */
async function incrementFailedLoginAttempts(id_usuario) {
  const { rows } = await db.query(
    `UPDATE usuarios
        SET failed_login_attempts = failed_login_attempts + 1,
            lock_until = CASE
              WHEN failed_login_attempts + 1 >= $2
                THEN NOW() + ($3 || ' minutes')::interval
              ELSE lock_until
            END
      WHERE id_usuario = $1
      RETURNING failed_login_attempts, lock_until`,
    [id_usuario, MAX_ATTEMPTS, String(LOCK_MINUTES)]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    failed_login_attempts: row.failed_login_attempts,
    lock_until: row.lock_until,
    locked: row.failed_login_attempts >= MAX_ATTEMPTS,
  };
}

/**
 * Resetea contador y desbloquea.
 */
async function resetLoginAttempts(id_usuario) {
  await db.query(
    `UPDATE usuarios
        SET failed_login_attempts = 0,
            lock_until = NULL
      WHERE id_usuario = $1`,
    [id_usuario]
  );
}

// ============================================================
// 2FA TOTP
// ============================================================

async function setTwoFactorSecret(id_usuario, secretBase32) {
  await db.query(
    `UPDATE usuarios
        SET two_factor_secret = $1,
            two_factor_enabled = FALSE
      WHERE id_usuario = $2`,
    [secretBase32, id_usuario]
  );
}

async function enableTwoFactor(id_usuario) {
  await db.query(
    `UPDATE usuarios
        SET two_factor_enabled = TRUE
      WHERE id_usuario = $1`,
    [id_usuario]
  );
}

async function disableTwoFactor(id_usuario) {
  await db.query(
    `UPDATE usuarios
        SET two_factor_secret = NULL,
            two_factor_enabled = FALSE
      WHERE id_usuario = $1`,
    [id_usuario]
  );
}

// ============================================================
// Activación de cuenta (cliente)
// ============================================================

async function activateUser(id_usuario, client = db) {
  const { rows } = await client.query(
    `UPDATE usuarios
        SET estado = 'activo'
      WHERE id_usuario = $1
      RETURNING id_usuario, estado`,
    [id_usuario]
  );
  return rows[0] || null;
}

module.exports = {
  findUserByEmail,
  findUserWithRoleById,
  findUserById,
  emailExists,
  createUser,
  updatePassword,
  updateLoginInfo,
  updateUserEstado,
  incrementFailedLoginAttempts,
  resetLoginAttempts,
  setTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
  activateUser,
  // expuestos para que el controller pueda usar la misma constante
  MAX_ATTEMPTS,
  LOCK_MINUTES,
};
