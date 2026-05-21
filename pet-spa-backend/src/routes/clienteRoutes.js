// src/routes/clienteRoutes.js
// Endpoints del módulo de clientes.
//
// Política de roles:
//   CLIENTE:              ver y editar su propio perfil
//   RECEPCION/ADMIN/JEFE: buscar clientes y ver fichas individuales

const clienteController = require('../controllers/clienteController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const { ROLES } = require('../utils/rolesUtils');

const STAFF_RECEPCION = [ROLES.RECEPCION, ROLES.ADMIN, ROLES.JEFE];

module.exports = (app) => {
  // ── Rutas del propio cliente ──────────────────────────────
  app.get(
    '/api/clientes/me',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    clienteController.getMiPerfil
  );

  app.put(
    '/api/clientes/me',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    clienteController.updateMiPerfil
  );

  // ── Rutas de staff ────────────────────────────────────────
  // IMPORTANTE: registrar '/api/clientes/me' ANTES de '/api/clientes/:idCliente'
  // para que el segmento "me" no caiga en el parámetro dinámico.
  app.get(
    '/api/clientes',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_RECEPCION),
    clienteController.buscarClientes
  );

  app.get(
    '/api/clientes/:idCliente',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(STAFF_RECEPCION),
    clienteController.getDetalleCliente
  );
};
