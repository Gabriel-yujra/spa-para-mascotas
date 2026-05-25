// src/models/productoModel.js
const db = require('../config/db');

async function listProductos({ includeInactivos = false } = {}) {
  const where = includeInactivos ? '' : `WHERE estado = 'disponible'`;
  const { rows } = await db.query(
    `SELECT * FROM productos ${where} ORDER BY nombre ASC`
  );
  return rows;
}

async function findProductoById(id_producto) {
  const { rows } = await db.query(
    `SELECT * FROM productos WHERE id_producto = $1 LIMIT 1`,
    [id_producto]
  );
  return rows[0] || null;
}

async function createProducto({ nombre, descripcion, categoria, precio, stock_unidades = 0, unidad_presentacion, sku, stock_minimo = 0 }) {
  const { rows } = await db.query(
    `INSERT INTO productos
       (nombre, descripcion, categoria, precio, stock_unidades,
        unidad_presentacion, sku, stock_minimo, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'disponible')
     RETURNING *`,
    [
      nombre,
      descripcion || null,
      categoria,
      parseFloat(precio),
      parseFloat(stock_unidades || 0),
      unidad_presentacion || null,
      sku || null,
      parseFloat(stock_minimo || 0),
    ]
  );
  return rows[0];
}

async function updateProducto(id_producto, { nombre, descripcion, categoria, precio, stock_unidades, unidad_presentacion, sku, stock_minimo }) {
  const { rows } = await db.query(
    `UPDATE productos
        SET nombre              = COALESCE($2,  nombre),
            descripcion         = COALESCE($3,  descripcion),
            categoria           = COALESCE($4,  categoria),
            precio              = COALESCE($5,  precio),
            stock_unidades      = COALESCE($6,  stock_unidades),
            unidad_presentacion = COALESCE($7,  unidad_presentacion),
            sku                 = COALESCE($8,  sku),
            stock_minimo        = COALESCE($9,  stock_minimo)
      WHERE id_producto = $1
      RETURNING *`,
    [
      id_producto,
      nombre          ?? null,
      descripcion     ?? null,
      categoria       ?? null,
      precio != null  ? parseFloat(precio)        : null,
      stock_unidades != null ? parseFloat(stock_unidades) : null,
      unidad_presentacion ?? null,
      sku             ?? null,
      stock_minimo != null ? parseFloat(stock_minimo) : null,
    ]
  );
  return rows[0] || null;
}

async function setProductoEstado(id_producto, estado) {
  const { rows } = await db.query(
    `UPDATE productos SET estado = $2 WHERE id_producto = $1 RETURNING *`,
    [id_producto, estado]
  );
  return rows[0] || null;
}

module.exports = { listProductos, findProductoById, createProducto, updateProducto, setProductoEstado };
