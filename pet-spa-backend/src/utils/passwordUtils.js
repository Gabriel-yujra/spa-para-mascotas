// src/utils/passwordUtils.js
// Hashing y verificación de contraseñas + política de seguridad
const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * Hashea una contraseña.
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compara contraseña plana con hash.
 */
async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Política de contraseña segura:
 *  - mínimo 8 caracteres
 *  - al menos 1 mayúscula
 *  - al menos 1 minúscula
 *  - al menos 1 número
 *  - al menos 1 símbolo
 * Devuelve { valid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (typeof password !== 'string' || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe incluir al menos una letra mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe incluir al menos una letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe incluir al menos un número');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('La contraseña debe incluir al menos un símbolo');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Genera una contraseña temporal segura (para empleados nuevos).
 */
function generateTempPassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const syms = '!@#$%&*?';
  const all = upper + lower + nums + syms;

  // Garantiza al menos uno de cada categoría
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    syms[Math.floor(Math.random() * syms.length)],
  ];
  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle
  pwd = pwd.sort(() => Math.random() - 0.5);
  return pwd.join('');
}

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateTempPassword,
};
