// src/utils/totpUtils.js
// Helpers para 2FA TOTP usando speakeasy + qrcode.
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const ISSUER = process.env.TOTP_ISSUER || 'PetSpa';

/**
 * Genera un nuevo secreto TOTP y la URL otpauth para el QR.
 * @param {string} accountLabel  Normalmente el email del usuario.
 * @returns {{ base32: string, otpauth_url: string }}
 */
function generateSecret(accountLabel) {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `${ISSUER}:${accountLabel}`,
    issuer: ISSUER,
  });
  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Verifica un código TOTP de 6 dígitos contra un secret base32.
 * window=1 acepta el código previo/posterior (~30s) para tolerar desfase de reloj.
 */
function verifyToken(secretBase32, token) {
  if (!secretBase32 || !token) return false;
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: 'base32',
    token: String(token).trim(),
    window: 1,
  });
}

/**
 * Genera el dataURL PNG del QR a partir de la otpauth_url.
 * El frontend puede ponerlo directo en <img :src="dataUrl"/>.
 */
async function buildQrDataUrl(otpauth_url) {
  return QRCode.toDataURL(otpauth_url);
}

module.exports = {
  generateSecret,
  verifyToken,
  buildQrDataUrl,
};
