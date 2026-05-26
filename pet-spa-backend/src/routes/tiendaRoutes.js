// src/routes/tiendaRoutes.js
const authRequired  = require('../middlewares/authRequired');
const requireRole   = require('../middlewares/requireRole');
const { ROLES }     = require('../utils/rolesUtils');
const productoModel = require('../models/productoModel');
const cajaModel     = require('../models/cajaModel');
const db            = require('../config/db');

const WHATSAPP_NUMBER = process.env.TIENDA_WA_NUMBER || '591XXXXXXXX';

module.exports = function tiendaRoutes(app) {
  // ── GET /api/tienda/productos ─────────────────────────────────────────────
  app.get(
    '/api/tienda/productos',
    authRequired,
    async (req, res, next) => {
      try {
        const productos = await productoModel.listProductos({ includeInactivos: false });
        return res.status(200).json({ productos });
      } catch (err) { next(err); }
    }
  );

  // ── POST /api/tienda/pedidos ──────────────────────────────────────────────
  // Crea el pedido, valida stock, devuelve mensaje WA + resumen para confirmación.
  // Body: { items: [{ id_producto, cantidad }] }
  app.post(
    '/api/tienda/pedidos',
    authRequired,
    requireRole([ROLES.CLIENTE]),
    async (req, res, next) => {
      try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: 'Debes incluir al menos un producto' });
        }

        const enriched = [];
        for (const item of items) {
          const qty = parseFloat(item.cantidad);
          if (!item.id_producto || isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Cada item necesita id_producto y cantidad > 0' });
          }
          const prod = await productoModel.findProductoById(item.id_producto);
          if (!prod || prod.estado !== 'disponible') {
            return res.status(400).json({ error: `Producto no disponible` });
          }
          if (parseFloat(prod.stock_unidades) < qty) {
            return res.status(400).json({
              error: `Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock_unidades} u.)`,
            });
          }
          enriched.push({ producto: prod, cantidad: qty });
        }

        const total = enriched.reduce(
          (sum, e) => sum + parseFloat(e.producto.precio) * e.cantidad,
          0
        );

        const { rows: clienteRows } = await db.query(
          `SELECT id_cliente FROM clientes WHERE id_usuario = $1 LIMIT 1`,
          [req.user.id_usuario]
        );
        const id_cliente = clienteRows[0]?.id_cliente || null;

        const { rows: pedidoRows } = await db.query(
          `INSERT INTO pedidos_clientes (id_cliente, total, estado)
           VALUES ($1, $2, 'pendiente') RETURNING id_pedido`,
          [id_cliente, total.toFixed(2)]
        );
        const id_pedido = pedidoRows[0].id_pedido;

        for (const e of enriched) {
          await db.query(
            `INSERT INTO detalle_pedido_clientes (id_pedido, id_producto, cantidad, precio_unitario)
             VALUES ($1, $2, $3, $4)`,
            [id_pedido, e.producto.id_producto, e.cantidad, e.producto.precio]
          );
        }

        const lineas = enriched.map(
          (e) =>
            `• ${e.producto.nombre} x${e.cantidad} = Bs ${(parseFloat(e.producto.precio) * e.cantidad).toFixed(2)}`
        );
        const mensaje =
          `*Pedido Pet Spa* 🐾\n` +
          lineas.join('\n') +
          `\n\n*Total: Bs ${total.toFixed(2)}*\n` +
          `Pedido #${id_pedido.slice(0, 8).toUpperCase()}`;

        const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

        const resumen = enriched.map((e) => ({
          nombre:         e.producto.nombre,
          cantidad:       e.cantidad,
          precio_unitario: parseFloat(e.producto.precio),
          subtotal:       parseFloat((parseFloat(e.producto.precio) * e.cantidad).toFixed(2)),
        }));

        return res.status(201).json({
          id_pedido,
          mensaje,
          waLink,
          total: parseFloat(total.toFixed(2)),
          resumen,
        });
      } catch (err) { next(err); }
    }
  );

  // ── POST /api/tienda/pedidos/:id/pagar ────────────────────────────────────
  // Body: { metodo_pago: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA' }
  // Marca el pedido como pagado y registra ingreso en la caja activa.
  app.post(
    '/api/tienda/pedidos/:id/pagar',
    authRequired,
    requireRole([ROLES.CLIENTE]),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { metodo_pago } = req.body;
        const METODOS = ['EFECTIVO', 'QR', 'TRANSFERENCIA'];
        if (!metodo_pago || !METODOS.includes(metodo_pago)) {
          return res.status(400).json({ error: `metodo_pago debe ser uno de: ${METODOS.join(', ')}` });
        }

        const { rows: clienteRows } = await db.query(
          `SELECT id_cliente FROM clientes WHERE id_usuario = $1 LIMIT 1`,
          [req.user.id_usuario]
        );
        const id_cliente = clienteRows[0]?.id_cliente;

        const { rows: pedidoRows } = await db.query(
          `SELECT * FROM pedidos_clientes WHERE id_pedido = $1`,
          [id]
        );
        const pedido = pedidoRows[0];
        if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
        if (String(pedido.id_cliente) !== String(id_cliente)) {
          return res.status(403).json({ error: 'Acceso denegado' });
        }
        if (pedido.estado !== 'pendiente') {
          return res.status(409).json({ error: 'El pedido ya fue procesado' });
        }

        const caja = await cajaModel.findCajaActiva();
        if (!caja) {
          return res.status(409).json({
            error: 'No hay una caja activa. Pide al administrador que abra la caja antes de pagar.',
          });
        }

        const client = await db.getClient();
        try {
          await client.query('BEGIN');
          await cajaModel.createTransaccion(
            {
              id_caja:            caja.id_caja,
              tipo:               'INGRESO',
              monto:              pedido.total,
              descripcion:        `Pedido tienda #${id.slice(0, 8).toUpperCase()}`,
              id_usuario_solicita: req.user.id_usuario,
              id_referencia:      id,
              metodo_pago,
            },
            client
          );
          await client.query(
            `UPDATE pedidos_clientes SET estado = 'pagado' WHERE id_pedido = $1`,
            [id]
          );
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }

        return res.status(200).json({ ok: true, mensaje: 'Pago registrado correctamente' });
      } catch (err) { next(err); }
    }
  );
};
