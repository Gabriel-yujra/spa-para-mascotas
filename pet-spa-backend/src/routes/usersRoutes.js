// src/routes/usersRoutes.js
// REEMPLAZO. Añade PATCH /api/usuarios/:id/estado para borrado lógico.
const userController = require('../controllers/userController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');

module.exports = (app) => {
  app.get('/api/usuarios/me', authRequired, userController.getMyProfile);

  app.get(
    '/api/usuarios/roles',
    authRequired,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    userController.listRoles
  );

  // Borrado lógico / cambio de estado
  app.patch(
    '/api/usuarios/:id/estado',
    authRequired,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    userController.changeUserEstado
  );
};
