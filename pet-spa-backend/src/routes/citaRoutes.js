// src/routes/citaRoutes.js
// Registra los endpoints del módulo de gestión de citas.
//
// Convenciones del proyecto:
//   - export (app) => { ... }
//   - middlewares: authRequired, requireRole, mustNotForcePasswordChange
//
// Política de roles:
//   - Cliente:               crear, listar suyas, cancelar la suya, ver detalle suyo
//   - Recepción/Admin/Jefe:  bandeja, confirmar, reprogramar, cancelar, no_asistio
//   - Groomer (trabajador):  ver asignadas, marcar en_progreso, completar

const citaController = require('../controllers/citaController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const { ROLES } = require('../utils/rolesUtils');

// Compatibilidad: ROLES.RECEPCION puede no existir aún en instalaciones viejas
const ROLE_RECEPCION = ROLES.RECEPCION || 'recepcion';
const ROLE_GROOMER   = ROLES.GROOMER   || 'groomer';

const STAFF_RECEPCION = [ROLES.ADMIN, ROLES.JEFE, ROLE_RECEPCION];

// El groomer en algunos despliegues es `trabajador` genérico; aceptamos ambos.
const ROLES_GROOMER = [ROLES.EMPLEADO, ROLE_GROOMER];

module.exports = (app) => {
  // ============================================================
  // CLIENTE
  // ============================================================
  app.post(
    '/api/citas',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    citaController.crearCita
  );

  app.get(
    '/api/citas/mis-citas',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    citaController.misCitas
  );

  app.patch(
    '/api/citas/:id/cancelar-cliente',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    citaController.cancelarComoCliente
  );

  // ============================================================
  // RECEPCIÓN / ADMIN / JEFE
  // ============================================================
  app.get(
    '/api/citas/pendientes',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_RECEPCION),
    citaController.listarPendientes
  );

  app.patch(
    '/api/citas/:id/confirmar',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_RECEPCION),
    citaController.confirmar
  );

  app.patch(
    '/api/citas/:id/reprogramar',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_RECEPCION),
    citaController.reprogramar
  );

  app.patch(
    '/api/citas/:id/cancelar',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_RECEPCION),
    citaController.cancelarComoRecepcion
  );

  app.patch(
    '/api/citas/:id/no-asistio',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_RECEPCION),
    citaController.noAsistio
  );

  // ============================================================
  // GROOMER
  // ============================================================
  app.get(
    '/api/citas/asignadas',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ROLES_GROOMER),
    citaController.misAsignadas
  );

  app.patch(
    '/api/citas/:id/en-progreso',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ROLES_GROOMER),
    citaController.enProgreso
  );

  app.patch(
    '/api/citas/:id/completar',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ROLES_GROOMER),
    citaController.completar
  );

  // ============================================================
  // DETALLE — cualquier rol autenticado (chequeo interno por rol)
  // ============================================================
  // IMPORTANTE: registrar esta ruta DESPUÉS de '/api/citas/mis-citas',
  // '/api/citas/pendientes' y '/api/citas/asignadas' para que esos paths
  // específicos no caigan en ':id'.
  app.get(
    '/api/citas/:id',
    authRequired,
    mustNotForcePasswordChange,
    citaController.detalleCita
  );
};
