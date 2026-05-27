// src/routes/groomingRoutes.js
// Role policy:
//   GROOMER     → agenda + ficha CRUD (own citas only)
//   RECEPCION / ADMIN / JEFE → read-only ficha for any cita
//   CLIENTE     → summary ficha for own completed citas

const groomingController = require('../controllers/groomingController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const { ROLES } = require('../utils/rolesUtils');
const multerGrooming = require('../config/multerGrooming');

module.exports = function groomingRoutes(app) {
  // ── Groomer: agenda ──────────────────────────────────────────────────────
  app.get(
    '/api/grooming/agenda',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.GROOMER]),
    groomingController.getAgendaDelDia
  );

  // ── IMPORTANT: static-segment routes before :idCita param routes ─────────

  // Cliente: summary ficha for own completed cita
  app.get(
    '/api/grooming/mis-citas/:idCita/ficha',
    authRequired,
    requireRole([ROLES.CLIENTE]),
    groomingController.getFichaCliente
  );

  // Staff: full read-only ficha — must be registered before the groomer route
  // so Express sees /fichas/:idCita/admin before /fichas/:idCita
  app.get(
    '/api/grooming/fichas/:idCita/admin',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.RECEPCION, ROLES.ADMIN, ROLES.JEFE]),
    groomingController.getFichaAdmin
  );

  // Groomer: full editable ficha
  app.get(
    '/api/grooming/fichas/:idCita',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.GROOMER]),
    groomingController.getFicha
  );

  app.put(
    '/api/grooming/fichas/:idCita',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.GROOMER]),
    groomingController.updateFicha
  );

  // ── Fotos de servicio (GROOMER — own citas) ──────────────────────────────────
  // POST /api/grooming/fichas/:idCita/fotos  — multipart, field "foto" + body "tipo"
  app.post(
    '/api/grooming/fichas/:idCita/fotos',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.GROOMER]),
    multerGrooming.single('foto'),
    groomingController.uploadFoto
  );

  // ── Insumos (IMPORTANT: registered before the bare :idCita routes above) ────
  // GET insumos for a cita (GROOMER — own citas)
  app.get(
    '/api/grooming/fichas/:idCita/insumos',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.GROOMER]),
    groomingController.getInsumos
  );

  // PUT replace insumos for a cita (GROOMER — own citas)
  app.put(
    '/api/grooming/fichas/:idCita/insumos',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.GROOMER]),
    groomingController.saveInsumos
  );
};
