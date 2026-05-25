// src/routes/productoRoutes.js
const productoModel = require('../models/productoModel');
const auditLogModel = require('../models/auditLogModel');
const authRequired = require('../middlewares/authRequired');
const mustNotForcePasswordChange = require('../middlewares/mustNotForcePasswordChange');
const requireRole = require('../middlewares/requireRole');
const { ROLES } = require('../utils/rolesUtils');
const { enviarAlertaStockBajo, getProductosConStockBajo } = require('../services/inventarioAlertaService');

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.JEFE];

module.exports = (app) => {
  // GET /api/productos
  app.get(
    '/api/productos',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const includeInactivos = req.query.all === 'true';
        const productos = await productoModel.listProductos({ includeInactivos });
        return res.status(200).json({ productos });
      } catch (err) { next(err); }
    }
  );

  // POST /api/productos
  app.post(
    '/api/productos',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { nombre, descripcion, categoria, precio, stock_unidades, unidad_presentacion, sku, stock_minimo } = req.body;
        if (!nombre || !categoria || precio == null) {
          return res.status(400).json({ error: 'nombre, categoria y precio son requeridos' });
        }
        if (parseFloat(precio) < 0) {
          return res.status(400).json({ error: 'precio no puede ser negativo' });
        }
        const producto = await productoModel.createProducto({
          nombre, descripcion, categoria, precio, stock_unidades, unidad_presentacion, sku, stock_minimo,
        });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'PRODUCTO_CREADO',
          detalle: JSON.stringify({ id_producto: producto.id_producto, nombre }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        enviarAlertaStockBajo(); // fire-and-forget
        return res.status(201).json({ producto });
      } catch (err) { next(err); }
    }
  );

  // POST /api/productos/alertas-stock  — manual trigger (ADMIN / JEFE)
  app.post(
    '/api/productos/alertas-stock',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const productos = await getProductosConStockBajo();
        if (productos.length === 0) {
          return res.status(200).json({ mensaje: 'No hay productos con stock bajo. No se envió ningún correo.' });
        }
        await enviarAlertaStockBajo();
        return res.status(200).json({
          mensaje: `Alerta enviada. ${productos.length} producto(s) con stock bajo.`,
          productos,
        });
      } catch (err) { next(err); }
    }
  );

  // PUT /api/productos/:id
  app.put(
    '/api/productos/:id',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const producto = await productoModel.updateProducto(req.params.id, req.body);
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'PRODUCTO_ACTUALIZADO',
          detalle: JSON.stringify({ id_producto: req.params.id }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        enviarAlertaStockBajo(); // fire-and-forget
        return res.status(200).json({ producto });
      } catch (err) { next(err); }
    }
  );

  // PATCH /api/productos/:id/estado
  app.patch(
    '/api/productos/:id/estado',
    authRequired,
    mustNotForcePasswordChange,
    requireRole(ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { estado } = req.body;
        if (!['disponible', 'agotado', 'descontinuado'].includes(estado)) {
          return res.status(400).json({ error: "estado debe ser 'disponible', 'agotado' o 'descontinuado'" });
        }
        const producto = await productoModel.setProductoEstado(req.params.id, estado);
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
        await auditLogModel.logAction({
          id_usuario: req.user.id_usuario,
          accion: 'PRODUCTO_ESTADO_CAMBIADO',
          detalle: JSON.stringify({ id_producto: req.params.id, estado }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
        return res.status(200).json({ producto });
      } catch (err) { next(err); }
    }
  );
};
