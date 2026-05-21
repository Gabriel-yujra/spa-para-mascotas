// src/routes/mascotaRoutes.js
// Endpoints del módulo de mascotas.
//
// Política de roles:
//   CLIENTE: CRUD sobre sus propias mascotas

const mascotaController = require('../controllers/mascotaController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const { ROLES } = require('../utils/rolesUtils');

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
};
