// src/api/authApi.js
// REEMPLAZO. Añade activate, verify2FA, twoFASetup, twoFAEnable, twoFADisable.
import http from './http';

export const authApi = {
  // --- existentes ---
  login(credentials) {
    return http.post('/auth/login', credentials).then((r) => r.data);
  },
  registerClient(data) {
    return http.post('/auth/register', data).then((r) => r.data);
  },
  changePassword(data) {
    return http.post('/auth/change-password', data).then((r) => r.data);
  },
  me() {
    return http.get('/auth/me').then((r) => r.data);
  },

  // --- nuevos ---
  /** Activación de cuenta de cliente con token recibido por correo. */
  activateAccount(token) {
    return http.post('/auth/activate', { token }).then((r) => r.data);
  },

  /** Completar login con 2FA: devuelve JWT real. */
  verify2FA(twoFAToken, code) {
    return http.post('/auth/2fa/verify', { twoFAToken, code }).then((r) => r.data);
  },

  /** Iniciar setup 2FA (admin). Devuelve { secret, otpauth_url, qr_data_url }. */
  twoFASetup() {
    return http.post('/auth/2fa/setup').then((r) => r.data);
  },

  /** Habilitar 2FA tras verificar el TOTP escaneado. */
  twoFAEnable(code) {
    return http.post('/auth/2fa/enable', { code }).then((r) => r.data);
  },

  /** Deshabilitar 2FA: requiere password + código TOTP. */
  twoFADisable(password, code) {
    return http.post('/auth/2fa/disable', { password, code }).then((r) => r.data);
  },
};
