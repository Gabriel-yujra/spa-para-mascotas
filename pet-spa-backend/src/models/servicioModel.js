// src/models/servicioModel.js
const db = require('../config/db');

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

// Para clientes y agenda: solo activos
async function listServicios() {
  const { rows } = await db.query(
    `SELECT id_servicio, nombre, descripcion, duracion_estimada_min, precio, activo
       FROM servicios
      WHERE activo = true
      ORDER BY nombre ASC`
  );
  return rows;
}

// Para admin: todos (activos e inactivos)
async function listAllServicios() {
  const { rows } = await db.query(
    `SELECT id_servicio, nombre, descripcion, duracion_estimada_min, precio,
            activo, permite_doble_booking, requiere_bloqueo_consecutivo
       FROM servicios
      ORDER BY nombre ASC`
  );
  return rows;
}

async function createServicio({ nombre, descripcion, duracion_estimada_min, precio, permite_doble_booking = false }) {
  const { rows } = await db.query(
    `INSERT INTO servicios (nombre, descripcion, duracion_estimada_min, precio, permite_doble_booking, activo)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [nombre, descripcion || null, parseInt(duracion_estimada_min), parseFloat(precio), !!permite_doble_booking]
  );
  return rows[0];
}

async function updateServicio(id_servicio, { nombre, descripcion, duracion_estimada_min, precio, permite_doble_booking }) {
  const { rows } = await db.query(
    `UPDATE servicios
        SET nombre                = COALESCE($2, nombre),
            descripcion           = COALESCE($3, descripcion),
            duracion_estimada_min = COALESCE($4, duracion_estimada_min),
            precio                = COALESCE($5, precio),
            permite_doble_booking = COALESCE($6, permite_doble_booking)
      WHERE id_servicio = $1
      RETURNING *`,
    [
      id_servicio,
      nombre ?? null,
      descripcion ?? null,
      duracion_estimada_min != null ? parseInt(duracion_estimada_min) : null,
      precio != null ? parseFloat(precio) : null,
      permite_doble_booking != null ? !!permite_doble_booking : null,
    ]
  );
  return rows[0] || null;
}

async function setServicioActivo(id_servicio, activo) {
  const { rows } = await db.query(
    `UPDATE servicios SET activo = $2 WHERE id_servicio = $1 RETURNING *`,
    [id_servicio, !!activo]
  );
  return rows[0] || null;
}

module.exports = {
  findServicioParaAgenda,
  listServicios,
  listAllServicios,
  createServicio,
  updateServicio,
  setServicioActivo,
};
