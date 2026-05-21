// src/models/groomingChecklistModel.js
// SQL-only model for checklist_items and ficha_grooming_checklist.
const db = require('../config/db');

/**
 * All available checklist items, ordered alphabetically.
 */
async function getAllItems() {
  const { rows } = await db.query(
    `SELECT id_item, nombre, descripcion
       FROM checklist_items
      ORDER BY nombre ASC`
  );
  return rows;
}

/**
 * Returns checklist entries for a ficha, joined with item metadata.
 * Only rows that have been saved (realizado or not) are returned.
 */
async function getChecklistByFichaId(idFicha) {
  const { rows } = await db.query(
    `SELECT fgc.id_ficha_item, fgc.id_ficha, fgc.id_item,
            fgc.realizado, fgc.observacion,
            ci.nombre AS item_nombre
       FROM ficha_grooming_checklist fgc
       JOIN checklist_items ci ON ci.id_item = fgc.id_item
      WHERE fgc.id_ficha = $1
      ORDER BY ci.nombre ASC`,
    [idFicha]
  );
  return rows;
}

/**
 * Upsert checklist items for a ficha.
 * items: [{ id_item: uuid, realizado: boolean, observacion: string|null }]
 * Requires UNIQUE(id_ficha, id_item) constraint (added in 2026-05-grooming-checklist.sql).
 */
async function upsertChecklistItems(idFicha, items, client = db) {
  const results = [];
  for (const item of items) {
    const { rows } = await client.query(
      `INSERT INTO ficha_grooming_checklist (id_ficha, id_item, realizado, observacion)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_ficha, id_item)
       DO UPDATE SET realizado = EXCLUDED.realizado,
                     observacion = EXCLUDED.observacion
       RETURNING id_ficha_item, id_ficha, id_item, realizado, observacion`,
      [idFicha, item.id_item, item.realizado ?? false, item.observacion ?? null]
    );
    if (rows[0]) results.push(rows[0]);
  }
  return results;
}

module.exports = {
  getAllItems,
  getChecklistByFichaId,
  upsertChecklistItems,
};
