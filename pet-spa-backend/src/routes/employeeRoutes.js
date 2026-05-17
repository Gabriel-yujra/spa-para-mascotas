// src/routes/employeeRoutes.js
const employeeController = require('../controllers/employeeController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const { ROLES } = require('../utils/rolesUtils');

module.exports = (app) => {
  // Crear empleado: solo admin / jefe, y deben haber cambiado su password inicial
  app.post(
    '/api/empleados',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    employeeController.createEmployee
  );

  // Listar empleados
  app.get(
    '/api/empleados',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    employeeController.listEmployees
  );

  // Actualizar empleado
  app.patch(
    '/api/empleados/:id',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    employeeController.updateEmployee
  );
};
