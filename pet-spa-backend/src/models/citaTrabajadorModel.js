// src/models/citaTrabajadorModel.js
// Consultas para detectar ocupación de groomers en rangos horarios.
//
// La regla de solapamiento de intervalos [a1, a2) y [b1, b2) es:
//     a1 < b2  AND  b1 < a2
// Se considera ocupada cualquier asignación cuya cita NO esté cancelada.
const db = require('../config/db');

/**
 * Devuelve TODAS las asignaciones (id_trabajador, fecha_inicio, fecha_fin)
 * de un día dado, con su estado de cita. Sirve para construir un mapa
 * en memoria si se hacen muchas consultas en el mismo día.
 *
 * Excluye citas canceladas para no bloquear slots inútilmente.
 */
async function listAsignacionesDeDia(fechaYMD) {
  const { rows } = await db.query(
    `SELECT ct.id_cita_trabajador, ct.id_cita, ct.id_trabajador,
            ct.fecha_inicio, ct.fecha_fin,
            c.id_servicio, c.estado_global
       FROM cita_trabajadores ct
       JOIN citas c ON c.id_cita = ct.id_cita
      WHERE c.fecha_cita = $1
        AND c.estado_global <> 'cancelada'`,
    [fechaYMD]
  );
  return rows;
}

/**
 * Cuenta cuántas asignaciones de un groomer se solapan con un rango dado.
 * Útil cuando se evalúa un solo slot o un solo groomer.
 *
 * NOTA: aquí pasamos rango como timestamps (Date o ISO string). pg los
 * acepta directamente para columnas timestamptz.
 */
async function contarSolapamientosGroomer(id_trabajador, rangoStart, rangoEnd) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS cnt
       FROM cita_trabajadores ct
       JOIN citas c ON c.id_cita = ct.id_cita
      WHERE ct.id_trabajador = $1
        AND c.estado_global <> 'cancelada'
        AND ct.fecha_inicio < $3
        AND COALESCE(ct.fecha_fin, ct.fecha_inicio) > $2`,
    [id_trabajador, rangoStart, rangoEnd]
  );
  return rows[0].cnt;
}

module.exports = {
  listAsignacionesDeDia,
  contarSolapamientosGroomer,
};
