// src/services/reportesService.js
// Report queries for ADMIN / JEFE. All queries are read-only.
const db = require('../config/db');

function toDateStart(str, fallback) {
  if (!str) return fallback;
  const d = new Date(str);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

// For "hasta" we want to include the full calendar day, so we use < nextDay.
function toDateNextDay(str, fallback) {
  if (!str) return fallback;
  const d = new Date(str);
  if (isNaN(d.getTime())) return fallback;
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

/**
 * Daily income totals from the transacciones table.
 * Returns [{ fecha, total }] ordered by date asc.
 */
async function getReporteIngresosPorDia({ desde, hasta } = {}) {
  const desdeVal = toDateStart(desde, new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
  const hastaVal = toDateNextDay(hasta, new Date(Date.now() + 24 * 3600 * 1000).toISOString());

  const { rows } = await db.query(
    `SELECT DATE(fecha_solicitud AT TIME ZONE 'America/La_Paz') AS fecha,
            SUM(monto)::numeric(12,2) AS total,
            COUNT(*)::int AS cantidad
       FROM transacciones
      WHERE tipo = 'INGRESO'
        AND estado_global = 'aprobada'
        AND fecha_solicitud >= $1
        AND fecha_solicitud <  $2
      GROUP BY 1
      ORDER BY 1 ASC`,
    [desdeVal, hastaVal]
  );
  return rows;
}

/**
 * Top services by number of completed citas.
 * Returns [{ servicio_nombre, cantidad, ingresos_total }] ordered by cantidad desc.
 */
async function getTopServiciosPorCantidad({ desde, hasta } = {}) {
  const desdeVal = toDateStart(desde, new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
  const hastaVal = toDateNextDay(hasta, new Date(Date.now() + 24 * 3600 * 1000).toISOString());

  const { rows } = await db.query(
    `SELECT s.nombre AS servicio_nombre,
            COUNT(c.id_cita)::int AS cantidad,
            COALESCE(SUM(s.precio), 0)::numeric(12,2) AS ingresos_estimados
       FROM citas c
       JOIN servicios s ON s.id_servicio = c.id_servicio
      WHERE c.estado_global = 'completada'
        AND c.fecha_cita >= $1::date
        AND c.fecha_cita <  $2::date
      GROUP BY s.id_servicio, s.nombre
      ORDER BY cantidad DESC
      LIMIT 10`,
    [desdeVal, hastaVal]
  );
  return rows;
}

/**
 * Completed citas per groomer.
 * Returns [{ groomer_nombre, completadas, en_progreso }] ordered by completadas desc.
 */
async function getServiciosPorGroomer({ desde, hasta } = {}) {
  const desdeVal = toDateStart(desde, new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
  const hastaVal = toDateNextDay(hasta, new Date(Date.now() + 24 * 3600 * 1000).toISOString());

  const { rows } = await db.query(
    `SELECT u.nombre AS groomer_nombre,
            COUNT(CASE WHEN c.estado_global = 'completada' THEN 1 END)::int AS completadas,
            COUNT(CASE WHEN c.estado_global = 'en_progreso' THEN 1 END)::int AS en_progreso,
            COUNT(*)::int AS total_asignadas
       FROM cita_trabajadores ct
       JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
       JOIN usuarios u ON u.id_usuario = t.id_usuario
       JOIN citas c ON c.id_cita = ct.id_cita
      WHERE c.fecha_cita >= $1::date
        AND c.fecha_cita <  $2::date
      GROUP BY u.id_usuario, u.nombre
      ORDER BY completadas DESC`,
    [desdeVal, hastaVal]
  );
  return rows;
}

module.exports = { getReporteIngresosPorDia, getTopServiciosPorCantidad, getServiciosPorGroomer };
