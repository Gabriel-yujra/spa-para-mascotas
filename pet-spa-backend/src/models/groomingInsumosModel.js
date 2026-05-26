// src/models/groomingInsumosModel.js
const db = require('../config/db');

async function findInsumosByFicha(id_ficha) {
  const { rows } = await db.query(
    `SELECT fi.id_ficha_insumo, fi.id_ficha, fi.id_producto,
            fi.unidades_usadas,
            p.nombre AS producto_nombre,
            p.unidad_presentacion,
            p.precio,
            p.stock_unidades
       FROM fichas_grooming_insumos fi
       JOIN productos p ON p.id_producto = fi.id_producto
      WHERE fi.id_ficha = $1
      ORDER BY p.nombre ASC`,
    [id_ficha]
  );
  return rows;
}

async function replaceInsumosForFicha(id_ficha, items, client = db) {
  await client.query(
    `DELETE FROM fichas_grooming_insumos WHERE id_ficha = $1`,
    [id_ficha]
  );
  if (!items || items.length === 0) return [];
  const inserted = [];
  for (const { id_producto, unidades_usadas } of items) {
    const qty = parseFloat(unidades_usadas);
    if (!id_producto || isNaN(qty) || qty <= 0) continue;
    const { rows } = await client.query(
      `INSERT INTO fichas_grooming_insumos (id_ficha, id_producto, unidades_usadas)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id_ficha, id_producto, qty]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

module.exports = { findInsumosByFicha, replaceInsumosForFicha };
