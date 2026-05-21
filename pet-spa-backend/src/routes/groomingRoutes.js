// src/routes/groomingRoutes.js
// Endpoints for the grooming module.
//
// Role policy:
//   GROOMER: all routes (owns their own agenda and fichas)

const groomingController = require('../controllers/groomingController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const { ROLES } = require('../utils/rolesUtils');

module.exports = function groomingRoutes(app) {
  app.get(
    '/api/grooming/agenda',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.GROOMER]),
    groomingController.getAgendaDelDia
  );

  // IMPORTANT: register '/api/grooming/fichas/:idCita' after static segments
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
};
