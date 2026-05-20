// src/routes/agendaRoutes.js
// Registra los endpoints del módulo de agenda.
//
// Convenciones del proyecto:
//   - El archivo exporta (app) => { ... } y se monta desde server.js.
//   - `authRequired` exige sesión.
//   - `requireRole([...])` valida roles permitidos.
//
// Política de acceso adoptada para este módulo:
//   - GET disponibilidad / groomers-disponibles → cualquier usuario autenticado
//       (cliente para reservar, recepción/admin para ver agenda).
//   - GET /bloqueos                              → staff (admin, jefe, recepcion).
//   - POST/DELETE /bloqueos                      → solo admin, jefe, recepcion.
//
// Si en tu proyecto aún no existe el rol 'recepcion' en utils/rolesUtils,
// la línea funcionará igual (compara strings); pero asegurate de insertarlo
// en BD para que el JWT pueda traerlo.

const agendaController = require('../controllers/agendaController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const { ROLES } = require('../utils/rolesUtils');

// Rol "recepcion" puede no existir aún en algunas instalaciones; lo derivamos
// con tolerancia para no romper si la constante no está exportada.
const ROLE_RECEPCION = ROLES.RECEPCION || 'recepcion';

const STAFF_AGENDA = [ROLES.ADMIN, ROLES.JEFE, ROLE_RECEPCION];

module.exports = (app) => {
  // ---- Disponibilidad y consultas (cualquier usuario autenticado) ----
  app.get(
    '/api/agenda/disponibilidad',
    authRequired,
    mustNotForcePasswordChange,
    agendaController.getDisponibilidad
  );

  app.get(
    '/api/agenda/groomers-disponibles',
    authRequired,
    mustNotForcePasswordChange,
    agendaController.getGroomersDisponibles
  );

  // ---- Bloqueos: lectura para staff ----
  app.get(
    '/api/agenda/bloqueos',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_AGENDA),
    agendaController.listBloqueos
  );

  // ---- Bloqueos: escritura solo staff ----
  app.post(
    '/api/agenda/bloqueos',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_AGENDA),
    agendaController.createBloqueo
  );

  app.delete(
    '/api/agenda/bloqueos/:id',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_AGENDA),
    agendaController.deleteBloqueo
  );
};
