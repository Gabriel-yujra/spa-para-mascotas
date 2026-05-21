// src/routes/servicioRoutes.js
// Read-only endpoint to list active services.
// Accessible to any authenticated user (clients need this to book appointments).
const servicioModel = require('../models/servicioModel');
const authRequired = require('../middlewares/authRequired');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');

module.exports = (app) => {
  app.get(
    '/api/servicios',
    authRequired,
    mustNotForcePasswordChange,
    async (_req, res, next) => {
      try {
        const servicios = await servicioModel.listServicios();
        return res.status(200).json({ servicios });
      } catch (err) {
        next(err);
      }
    }
  );
};
