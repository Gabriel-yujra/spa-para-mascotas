// src/models/bloqueoAgendaModel.js
// CRUD mínimo sobre `bloqueos_agenda`.
//
// La tabla tiene id_trabajador NULL = bloqueo GLOBAL.
const db = require('../config/db');

/**
 * Bloqueos GLOBALES (id_trabajador IS NULL) para un día.
 * Si hay al menos uno, el spa entero está cerrado ese día.
 */
async function listBloqueosGlobales(fechaYMD) {
  const { rows } = await db.query(
    `SELECT id_bloqueo, fecha, motivo, tipo
       FROM bloqueos_agenda
      WHERE fecha = $1
        AND id_trabajador IS NULL`,
    [fechaYMD]
  );
  return rows;
}

/**
 * Bloqueos POR TRABAJADOR para un día. Devuelve un Set/array de id_trabajador.
 */
async function listGroomersBloqueadosEnFecha(fechaYMD) {
  const { rows } = await db.query(
    `SELECT id_trabajador
       FROM bloqueos_agenda
      WHERE fecha = $1
        AND id_trabajador IS NOT NULL`,
    [fechaYMD]
  );
  return rows.map((r) => r.id_trabajador);
}

/**
 * Listado de bloqueos en un rango (para vista de administración).
 */
async function listBloqueosEnRango(desdeYMD, hastaYMD) {
  const { rows } = await db.query(
    `SELECT b.id_bloqueo, b.fecha, b.motivo, b.tipo,
            b.id_trabajador, u.nombre AS nombre_trabajador
       FROM bloqueos_agenda b
       LEFT JOIN trabajadores t ON t.id_trabajador = b.id_trabajador
       LEFT JOIN usuarios u ON u.id_usuario = t.id_usuario
      WHERE b.fecha BETWEEN $1 AND $2
      ORDER BY b.fecha ASC, u.nombre ASC NULLS FIRST`,
    [desdeYMD, hastaYMD]
  );
  return rows;
}

/**
 * Crear un bloqueo (global si id_trabajador es null).
 */
async function createBloqueo({ fecha, motivo, tipo, id_trabajador = null }) {
  const { rows } = await db.query(
    `INSERT INTO bloqueos_agenda (fecha, motivo, tipo, id_trabajador)
     VALUES ($1, $2, $3, $4)
     RETURNING id_bloqueo, fecha, motivo, tipo, id_trabajador`,
    [fecha, motivo, tipo, id_trabajador]
  );
  return rows[0];
}

async function deleteBloqueo(id_bloqueo) {
  const { rowCount } = await db.query(
    `DELETE FROM bloqueos_agenda WHERE id_bloqueo = $1`,
    [id_bloqueo]
  );
  return rowCount > 0;
}

module.exports = {
  listBloqueosGlobales,
  listGroomersBloqueadosEnFecha,
  listBloqueosEnRango,
  createBloqueo,
  deleteBloqueo,
};
