// src/routes/opinionRoutes.js
const opinionModel = require('../models/opinionModel');
const citaModel    = require('../models/citaModel');
const clienteModel = require('../models/clienteModel');
const auditLogModel = require('../models/auditLogModel');
const authRequired = require('../middlewares/authRequired');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');

module.exports = (app) => {
  // POST /api/opiniones — cliente deja opinión sobre cita completada
  app.post(
    '/api/opiniones',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    async (req, res, next) => {
      try {
        const { id_cita, calificacion, comentario } = req.body;
        if (!id_cita || calificacion == null) {
          return res.status(400).json({ error: 'id_cita y calificacion son requeridos' });
        }
        const cal = parseInt(calificacion);
        if (isNaN(cal) || cal < 1 || cal > 5) {
          return res.status(400).json({ error: 'calificacion debe ser un número del 1 al 5' });
        }

        const cita = await citaModel.findCitaById(id_cita);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        if (cita.estado_global !== 'completada') {
          return res.status(400).json({ error: 'Solo se pueden calificar citas completadas' });
        }

        const id_cliente = await clienteModel.findIdClienteByUsuario(req.user.id_usuario);
        if (!id_cliente || cita.id_cliente !== id_cliente) {
          return res.status(403).json({ error: 'No es tu cita' });
        }

        const existente = await opinionModel.findByCita(id_cita);
        if (existente) return res.status(409).json({ error: 'Ya dejaste una opinión para esta cita' });

        const opinion = await opinionModel.createOpinion({ id_cita, id_cliente, calificacion: cal, comentario });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'OPINION_CREADA',
          detalle: JSON.stringify({ id_opinion: opinion.id_opinion, id_cita, calificacion: cal }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(201).json({ opinion });
      } catch (err) { next(err); }
    }
  );

  // GET /api/opiniones/mis-opiniones — cliente ve sus opiniones
  app.get(
    '/api/opiniones/mis-opiniones',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.CLIENTE]),
    async (req, res, next) => {
      try {
        const id_cliente = await clienteModel.findIdClienteByUsuario(req.user.id_usuario);
        if (!id_cliente) return res.status(404).json({ error: 'Perfil de cliente no encontrado' });
        const opiniones = await opinionModel.getMisOpiniones(id_cliente);
        return res.status(200).json({ opiniones });
      } catch (err) { next(err); }
    }
  );

  // GET /api/opiniones/resumen — admin/jefe ve resumen estadístico
  app.get(
    '/api/opiniones/resumen',
    authRequired,
    mustNotForcePasswordChange,
    requireRole([ROLES.ADMIN, ROLES.JEFE]),
    async (req, res, next) => {
      try {
        const resumen = await opinionModel.getResumen();
        const recientes = await opinionModel.listOpiniones({ limit: 10, offset: 0 });
        return res.status(200).json({ resumen, recientes });
      } catch (err) { next(err); }
    }
  );
};
