// src/routes/pagosRoutes.js
const pagosModel = require('../models/pagosEmpleadoModel');
const cajaModel  = require('../models/cajaModel');
const auditLogModel = require('../models/auditLogModel');
const authRequired = require('../middlewares/authRequired');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.JEFE];

module.exports = (app) => {
  // POST /api/pagos-empleados — registrar pago y crear egreso en caja activa
  app.post(
    '/api/pagos-empleados',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { id_trabajador, monto, periodo_desde, periodo_hasta, descripcion } = req.body;
        if (!id_trabajador || monto == null || !periodo_desde || !periodo_hasta) {
          return res.status(400).json({
            error: 'id_trabajador, monto, periodo_desde y periodo_hasta son requeridos',
          });
        }
        if (parseFloat(monto) <= 0) {
          return res.status(400).json({ error: 'monto debe ser mayor a 0' });
        }

        const pago = await pagosModel.createPago({
          id_trabajador,
          monto: parseFloat(monto),
          periodo_desde,
          periodo_hasta,
          descripcion,
        });

        // Registrar egreso en caja activa si existe
        const caja = await cajaModel.findCajaActiva();
        if (caja) {
          await cajaModel.createTransaccion({
            id_caja: caja.id_caja,
            tipo: 'EGRESO',
            monto: parseFloat(monto),
            descripcion: descripcion || `Pago a empleado — período ${periodo_desde} / ${periodo_hasta}`,
            id_usuario_solicita: req.user.id_usuario,
          });
        }

        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'PAGO_EMPLEADO_CREADO',
          detalle: JSON.stringify({ id_pago: pago.id_pago, id_trabajador, monto }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });

        return res.status(201).json({ pago, caja_actualizada: !!caja });
      } catch (err) { next(err); }
    }
  );

  // GET /api/pagos-empleados
  app.get(
    '/api/pagos-empleados',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { id_trabajador, desde, hasta } = req.query;
        const pagos = await pagosModel.listPagos({ id_trabajador, desde, hasta });
        return res.status(200).json({ pagos });
      } catch (err) { next(err); }
    }
  );
};
