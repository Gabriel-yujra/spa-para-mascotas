// src/utils/validators.js
// REEMPLAZO. Mantiene la firma anterior y añade `flags` estructurados.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
}

/**
 * Política de contraseña segura (igual al backend):
 *  - mínimo 8 caracteres
 *  - al menos 1 mayúscula
 *  - al menos 1 minúscula
 *  - al menos 1 número
 *  - al menos 1 símbolo
 *
 * Devuelve:
 *  {
 *    valid:   boolean,                // cumple TODA la política
 *    score:   number,                 // 0..5 (uno por requisito cumplido)
 *    errors:  string[],               // mensajes legibles
 *    label:   string,                 // 'Muy débil' | 'Débil' | ...
 *    flags:   { hasMinLength, hasUpper, hasLower, hasNumber, hasSymbol }
 *  }
 */
export function isStrongPassword(password) {
  const pwd = typeof password === 'string' ? password : '';
  const flags = {
    hasMinLength: pwd.length >= 8,
    hasUpper:     /[A-Z]/.test(pwd),
    hasLower:     /[a-z]/.test(pwd),
    hasNumber:    /[0-9]/.test(pwd),
    hasSymbol:    /[^A-Za-z0-9]/.test(pwd),
  };

  const errors = [];
  if (!flags.hasMinLength) errors.push('Debe tener al menos 8 caracteres');
  if (!flags.hasUpper)     errors.push('Debe incluir una mayúscula');
  if (!flags.hasLower)     errors.push('Debe incluir una minúscula');
  if (!flags.hasNumber)    errors.push('Debe incluir un número');
  if (!flags.hasSymbol)    errors.push('Debe incluir un símbolo');

  const score = Object.values(flags).filter(Boolean).length;

  let label = 'Muy débil';
  if (score >= 5) label = 'Muy fuerte';
  else if (score >= 4) label = 'Fuerte';
  else if (score >= 3) label = 'Aceptable';
  else if (score >= 2) label = 'Débil';

  return {
    valid: errors.length === 0,
    score,
    errors,
    label,
    flags,
  };
}

export function isNonEmpty(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
