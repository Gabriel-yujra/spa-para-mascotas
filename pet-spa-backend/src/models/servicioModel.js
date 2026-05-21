// src/models/servicioModel.js
// Solo SQL. Consultas mínimas necesarias para el módulo de agenda.
const db = require('../config/db');

/**
 * Devuelve los campos del servicio relevantes para el cálculo de slots.
 */
async function findServicioParaAgenda(id_servicio) {
  const { rows } = await db.query(
    `SELECT id_servicio, nombre, duracion_estimada_min, precio,
            activo, permite_doble_booking, requiere_bloqueo_consecutivo,
            factor_tamano_raza
       FROM servicios
      WHERE id_servicio = $1
      LIMIT 1`,
    [id_servicio]
  );
  return rows[0] || null;
}

async function listServicios() {
  const { rows } = await db.query(
    `SELECT id_servicio, nombre, descripcion, duracion_estimada_min, precio, activo
       FROM servicios
      WHERE activo = true
      ORDER BY nombre ASC`
  );
  return rows;
}

module.exports = { findServicioParaAgenda, listServicios };
