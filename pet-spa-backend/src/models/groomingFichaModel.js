// src/models/groomingFichaModel.js
// SQL-only model for fichas_grooming and fotos_grooming.
// All write functions accept an optional `client` for transaction participation.
const db = require('../config/db');

const CAMPOS_FICHA = `
  fg.id_ficha, fg.id_cita,
  fg.estado_ingreso, fg.observaciones, fg.recomendaciones, fg.tamano_mascota,
  fg.temperatura, fg.notas_internas, fg.consumido_inventario,
  fg.fecha_creacion, fg.fecha_cierre
`;

/**
 * Fetch the grooming ficha for a given cita.
 * Returns null if not yet created.
 */
async function getFichaByCitaId(idCita) {
  const { rows } = await db.query(
    `SELECT ${CAMPOS_FICHA}
       FROM fichas_grooming fg
      WHERE fg.id_cita = $1
      LIMIT 1`,
    [idCita]
  );
  return rows[0] || null;
}

/**
 * Insert a new ficha for the given cita.
 * data: { estado_ingreso, observaciones, recomendaciones, tamano_mascota, temperatura, notas_internas }
 * All data fields are optional; defaults to empty/null.
 */
async function createFichaForCita(idCita, data = {}, client = db) {
  const {
    estado_ingreso    = null,
    observaciones     = null,
    recomendaciones   = null,
    tamano_mascota    = null,
    temperatura       = null,
    notas_internas    = null,
  } = data;
  const { rows } = await client.query(
    `INSERT INTO fichas_grooming
       (id_cita, estado_ingreso, observaciones, recomendaciones, tamano_mascota, temperatura, notas_internas)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_ficha, id_cita, estado_ingreso, observaciones, recomendaciones,
               tamano_mascota, temperatura, notas_internas, consumido_inventario,
               fecha_creacion, fecha_cierre`,
    [idCita, estado_ingreso, observaciones, recomendaciones, tamano_mascota, temperatura, notas_internas]
  );
  return rows[0];
}

/**
 * Partial update of a ficha. Only updates fields present in `fields`.
 * Allowed fields: estado_ingreso, observaciones, recomendaciones, tamano_mascota,
 *                 temperatura, notas_internas, fecha_cierre, consumido_inventario
 */
async function updateFicha(idFicha, fields, client = db) {
  const allowed = [
    'estado_ingreso', 'observaciones', 'recomendaciones', 'tamano_mascota',
    'temperatura', 'notas_internas', 'fecha_cierre', 'consumido_inventario',
  ];
  const sets = [];
  const values = [];
  let idx = 1;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = $${idx++}`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return null;

  values.push(idFicha);
  const { rows } = await client.query(
    `UPDATE fichas_grooming
        SET ${sets.join(', ')}
      WHERE id_ficha = $${idx}
      RETURNING id_ficha, id_cita, estado_ingreso, observaciones, recomendaciones,
                tamano_mascota, temperatura, notas_internas, consumido_inventario,
                fecha_creacion, fecha_cierre`,
    values
  );
  return rows[0] || null;
}

/**
 * Returns all photos for a ficha, ordered by fecha_registro ASC.
 */
async function getFotosByFichaId(idFicha) {
  const { rows } = await db.query(
    `SELECT id_foto, id_ficha, tipo, url_foto, fecha_registro
       FROM fotos_grooming
      WHERE id_ficha = $1
      ORDER BY fecha_registro ASC`,
    [idFicha]
  );
  return rows;
}

module.exports = {
  getFichaByCitaId,
  createFichaForCita,
  updateFicha,
  getFotosByFichaId,
};
