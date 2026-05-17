// src/routes/authRoutes.js
// REEMPLAZO. Añade /activate, /2fa/setup, /2fa/enable, /2fa/disable, /2fa/verify.
const authController = require('../controllers/authController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');

module.exports = (app) => {
  // --- Públicas ---
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/activate', authController.activate);
  app.post('/api/auth/2fa/verify', authController.twoFAVerify); // pública: completa el login

  // --- Requieren sesión ---
  app.post('/api/auth/change-password', authRequired, authController.changePassword);
  app.get('/api/auth/me', authRequired, authController.me);

  // --- 2FA: solo ADMIN ---
  app.post(
    '/api/auth/2fa/setup',
    authRequired,
    requireRole([ROLES.ADMIN]),
    authController.twoFASetup
  );
  app.post(
    '/api/auth/2fa/enable',
    authRequired,
    requireRole([ROLES.ADMIN]),
    authController.twoFAEnable
  );
  app.post(
    '/api/auth/2fa/disable',
    authRequired,
    requireRole([ROLES.ADMIN]),
    authController.twoFADisable
  );
};
