// src/routes/servicioRoutes.js
const servicioModel = require('../models/servicioModel');
const auditLogModel = require('../models/auditLogModel');
const authRequired = require('../middlewares/authRequired');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.JEFE];

module.exports = (app) => {
  // GET /api/servicios — any authenticated user (clients need this to book)
  app.get(
    '/api/servicios',
    authRequired,
    mustNotForcePasswordChange,
    async (_req, res, next) => {
      try {
        const servicios = await servicioModel.listServicios();
        return res.status(200).json({ servicios });
      } catch (err) { next(err); }
    }
  );

  // GET /api/servicios/admin — all services including inactive (admin/jefe)
  app.get(
    '/api/servicios/admin',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        const servicios = await servicioModel.listAllServicios();
        return res.status(200).json({ servicios });
      } catch (err) { next(err); }
    }
  );

  // POST /api/servicios
  app.post(
    '/api/servicios',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { nombre, descripcion, duracion_estimada_min, precio, permite_doble_booking } = req.body;
        if (!nombre || duracion_estimada_min == null || precio == null) {
          return res.status(400).json({ error: 'nombre, duracion_estimada_min y precio son requeridos' });
        }
        if (parseInt(duracion_estimada_min) <= 0) {
          return res.status(400).json({ error: 'duracion_estimada_min debe ser mayor a 0' });
        }
        if (parseFloat(precio) < 0) {
          return res.status(400).json({ error: 'precio no puede ser negativo' });
        }
        const servicio = await servicioModel.createServicio({
          nombre, descripcion, duracion_estimada_min, precio, permite_doble_booking,
        });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'SERVICIO_CREADO',
          detalle: JSON.stringify({ id_servicio: servicio.id_servicio, nombre }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(201).json({ servicio });
      } catch (err) { next(err); }
    }
  );

  // PUT /api/servicios/:id
  app.put(
    '/api/servicios/:id',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { nombre, descripcion, duracion_estimada_min, precio, permite_doble_booking } = req.body;
        const servicio = await servicioModel.updateServicio(req.params.id, {
          nombre, descripcion, duracion_estimada_min, precio, permite_doble_booking,
        });
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'SERVICIO_ACTUALIZADO',
          detalle: JSON.stringify({ id_servicio: req.params.id }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(200).json({ servicio });
      } catch (err) { next(err); }
    }
  );

  // PATCH /api/servicios/:id/estado
  app.patch(
    '/api/servicios/:id/estado',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { activo } = req.body;
        if (activo == null) return res.status(400).json({ error: 'activo es requerido' });
        const servicio = await servicioModel.setServicioActivo(req.params.id, activo);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: activo ? 'SERVICIO_ACTIVADO' : 'SERVICIO_DESACTIVADO',
          detalle: JSON.stringify({ id_servicio: req.params.id }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(200).json({ servicio });
      } catch (err) { next(err); }
    }
  );
};
