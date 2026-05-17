// src/routes/auditRoutes.js
// NUEVO. Endpoints de auditoría para admin/jefe.
const auditController = require('../controllers/auditController');
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');

module.exports = (app) => {
  app.get(
    '/api/audit-log',
    authRequired,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    auditController.listLogs
  );

  app.get(
    '/api/audit-log/export',
    authRequired,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    auditController.exportLogs
  );
};
