// src/routes/mascotaRoutes.js
// Endpoints del módulo de mascotas.
//
// Política de roles:
//   CLIENTE: CRUD sobre sus propias mascotas

const mascotaController = require('../controllers/mascotaController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const multerMascotas = require('../config/multerMascotas');
const { ROLES } = require('../utils/rolesUtils');

const STAFF_MASCOTA = [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION, ROLES.EMPLEADO, ROLES.GROOMER];
const FOTO_ROLES   = [ROLES.CLIENTE, ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION];

module.exports = (app) => {
  // IMPORTANTE: registrar '/api/mascotas/mias' ANTES de '/api/mascotas/:id'
  // para que el segmento "mias" no caiga en el parámetro dinámico.
  app.get(
    '/api/mascotas/mias',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    mascotaController.getMisMascotas
  );

  app.post(
    '/api/mascotas',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    mascotaController.createMascota
  );

  app.put(
    '/api/mascotas/:id',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    mascotaController.updateMascota
  );

  app.delete(
    '/api/mascotas/:id',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    mascotaController.deleteMascota
  );

  // ── Subir foto de mascota ────────────────────────────────
  // IMPORTANTE: registrar ANTES de '/api/mascotas/:id' (GET) porque el segmento
  // '/foto' sería capturado por ':id' si se registra después.
  app.post(
    '/api/mascotas/:id/foto',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(FOTO_ROLES),
    multerMascotas.single('foto'),
    mascotaController.uploadFoto
  );

  // ── Staff: view any pet by ID ─────────────────────────────
  // Registered after all client routes so '/mias' is never captured by ':id'.
  app.get(
    '/api/mascotas/:id',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_MASCOTA),
    mascotaController.getMascotaByIdForStaff
  );
};
