// src/routes/cajaRoutes.js
const cajaModel = require('../models/cajaModel');
const auditLogModel = require('../models/auditLogModel');
const authRequired = require('../middlewares/authRequired');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');

const CAJA_ROLES = [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION];
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.JEFE];

module.exports = (app) => {
  // GET /api/caja/actual — caja activa + resumen + transacciones
  app.get(
    '/api/caja/actual',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(CAJA_ROLES),
    async (req, res, next) => {
      try {
        const caja = await cajaModel.findCajaActiva();
        if (!caja) return res.status(200).json({ caja: null, resumen: null, transacciones: [] });
        const [resumen, transacciones] = await Promise.all([
          cajaModel.getCajaResumen(caja.id_caja),
          cajaModel.listTransacciones(caja.id_caja),
        ]);
        return res.status(200).json({ caja, resumen, transacciones });
      } catch (err) { next(err); }
    }
  );

  // POST /api/caja — abrir nueva caja
  app.post(
    '/api/caja',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(CAJA_ROLES),
    async (req, res, next) => {
      try {
        const existing = await cajaModel.findCajaActiva();
        if (existing) return res.status(409).json({ error: 'Ya existe una caja activa. Ciérrela antes de abrir una nueva.' });
        const { nombre, descripcion } = req.body;
        if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'nombre es requerido' });
        const caja = await cajaModel.createCaja({ nombre: nombre.trim(), descripcion });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'CAJA_ABIERTA',
          detalle: JSON.stringify({ id_caja: caja.id_caja, nombre: caja.nombre }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(201).json({ caja });
      } catch (err) { next(err); }
    }
  );

  // PATCH /api/caja/:id/cerrar — cerrar caja (solo admin/jefe)
  app.patch(
    '/api/caja/:id/cerrar',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const caja = await cajaModel.cerrarCaja(req.params.id);
        if (!caja) return res.status(404).json({ error: 'Caja no encontrada' });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'CAJA_CERRADA',
          detalle: JSON.stringify({ id_caja: req.params.id }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(200).json({ caja });
      } catch (err) { next(err); }
    }
  );

  // POST /api/caja/transacciones — registrar ingreso o egreso
  app.post(
    '/api/caja/transacciones',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(CAJA_ROLES),
    async (req, res, next) => {
      try {
        const { tipo, monto, descripcion, id_referencia } = req.body;
        if (!tipo || !['INGRESO', 'EGRESO'].includes(tipo)) {
          return res.status(400).json({ error: 'tipo debe ser INGRESO o EGRESO' });
        }
        if (!monto || parseFloat(monto) <= 0) {
          return res.status(400).json({ error: 'monto debe ser mayor a 0' });
        }
        const caja = await cajaModel.findCajaActiva();
        if (!caja) return res.status(409).json({ error: 'No hay caja activa. Abra una caja primero.' });
        const transaccion = await cajaModel.createTransaccion({
          id_caja: caja.id_caja,
          tipo,
          monto: parseFloat(monto),
          descripcion,
          id_usuario_solicita: req.user.id_usuario,
          id_referencia: id_referencia || null,
        });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'TRANSACCION_CREADA',
          detalle: JSON.stringify({ tipo, monto, id_caja: caja.id_caja }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(201).json({ transaccion });
      } catch (err) { next(err); }
    }
  );
};
