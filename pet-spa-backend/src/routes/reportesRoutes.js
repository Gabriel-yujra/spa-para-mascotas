// src/routes/reportesRoutes.js
// Read-only reports: ADMIN and JEFE only.
const authRequired = require('../middlewares/authRequired');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const requireRole  = require('../middlewares/requireRole');
const { ROLES }    = require('../utils/rolesUtils');
const reportesService = require('../services/reportesService');

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.JEFE];

module.exports = function reportesRoutes(app) {
  // GET /api/reportes/ingresos-diarios?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
  app.get(
    '/api/reportes/ingresos-diarios',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const datos = await reportesService.getReporteIngresosPorDia(req.query);
        return res.status(200).json({ datos });
      } catch (err) { next(err); }
    }
  );

  // GET /api/reportes/top-servicios?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
  app.get(
    '/api/reportes/top-servicios',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const datos = await reportesService.getTopServiciosPorCantidad(req.query);
        return res.status(200).json({ datos });
      } catch (err) { next(err); }
    }
  );

  // GET /api/reportes/servicios-por-groomer?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
  app.get(
    '/api/reportes/servicios-por-groomer',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const datos = await reportesService.getServiciosPorGroomer(req.query);
        return res.status(200).json({ datos });
      } catch (err) { next(err); }
    }
  );
};
