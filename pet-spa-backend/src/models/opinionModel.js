// src/models/opinionModel.js
const db = require('../config/db');

async function findByCita(id_cita) {
  const { rows } = await db.query(
    `SELECT * FROM opiniones WHERE id_cita = $1 LIMIT 1`,
    [id_cita]
  );
  return rows[0] || null;
}

async function createOpinion({ id_cita, id_cliente, calificacion, comentario }) {
  const { rows } = await db.query(
    `INSERT INTO opiniones (id_cita, id_cliente, calificacion, comentario)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id_cita, id_cliente, parseInt(calificacion), comentario || null]
  );
  return rows[0];
}

async function getMisOpiniones(id_cliente) {
  const { rows } = await db.query(
    `SELECT o.id_opinion, o.id_cita, o.calificacion, o.comentario, o.fecha_opinion,
            c.fecha_cita, s.nombre AS servicio_nombre
       FROM opiniones o
       JOIN citas    c ON c.id_cita     = o.id_cita
       JOIN servicios s ON s.id_servicio = c.id_servicio
      WHERE o.id_cliente = $1
      ORDER BY o.fecha_opinion DESC`,
    [id_cliente]
  );
  return rows;
}

async function getResumen() {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS total_opiniones,
       ROUND(AVG(calificacion)::numeric, 2) AS promedio,
       COUNT(CASE WHEN calificacion = 5 THEN 1 END)::int AS cinco_estrellas,
       COUNT(CASE WHEN calificacion = 4 THEN 1 END)::int AS cuatro_estrellas,
       COUNT(CASE WHEN calificacion = 3 THEN 1 END)::int AS tres_estrellas,
       COUNT(CASE WHEN calificacion = 2 THEN 1 END)::int AS dos_estrellas,
       COUNT(CASE WHEN calificacion = 1 THEN 1 END)::int AS una_estrella
     FROM opiniones`
  );
  return rows[0];
}

async function listOpiniones({ limit = 20, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT o.id_opinion, o.calificacion, o.comentario, o.fecha_opinion,
            u.nombre AS nombre_cliente, c.fecha_cita, s.nombre AS servicio_nombre
       FROM opiniones o
       JOIN clientes cl ON cl.id_cliente  = o.id_cliente
       JOIN usuarios u  ON u.id_usuario   = cl.id_usuario
       JOIN citas    c  ON c.id_cita      = o.id_cita
       JOIN servicios s ON s.id_servicio  = c.id_servicio
      ORDER BY o.fecha_opinion DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

module.exports = { findByCita, createOpinion, getMisOpiniones, getResumen, listOpiniones };
