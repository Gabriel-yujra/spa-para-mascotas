// src/models/citaTrabajadorWriteModel.js
// Operaciones de escritura sobre `cita_trabajadores`.
// La parte de LECTURA (listAsignacionesDeDia, contarSolapamientos) ya está en
// el módulo de agenda; aquí solo añadimos el ÍNDICE inverso para gestionar la
// asignación de groomers a una cita.
const db = require('../config/db');

/**
 * Asigna un groomer a una cita con su rango horario.
 */
async function asignarGroomer(
  { id_cita, id_trabajador, fecha_inicio, fecha_fin },
  client = db
) {
  const { rows } = await client.query(
    `INSERT INTO cita_trabajadores (id_cita, id_trabajador, fecha_inicio, fecha_fin)
     VALUES ($1, $2, $3, $4)
     RETURNING id_cita_trabajador, id_cita, id_trabajador, fecha_inicio, fecha_fin`,
    [id_cita, id_trabajador, fecha_inicio, fecha_fin]
  );
  return rows[0];
}

/**
 * Listar groomers asignados a una cita.
 */
async function listGroomersDeCita(id_cita) {
  const { rows } = await db.query(
    `SELECT ct.id_cita_trabajador, ct.id_trabajador, ct.fecha_inicio, ct.fecha_fin,
            u.nombre AS nombre_trabajador, t.especialidad
       FROM cita_trabajadores ct
       JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
       JOIN usuarios u    ON u.id_usuario    = t.id_usuario
      WHERE ct.id_cita = $1
      ORDER BY ct.fecha_inicio ASC`,
    [id_cita]
  );
  return rows;
}

/**
 * Borra TODAS las asignaciones de una cita (usado al reprogramar
 * o cuando recepción reasigna groomers antes de confirmar).
 */
async function clearGroomersDeCita(id_cita, client = db) {
  const { rowCount } = await client.query(
    `DELETE FROM cita_trabajadores WHERE id_cita = $1`,
    [id_cita]
  );
  return rowCount;
}

/**
 * Actualiza los rangos horarios de TODAS las asignaciones de una cita
 * a un nuevo (fecha_inicio, fecha_fin). Útil cuando se reprograma una cita
 * sin cambiar de groomer.
 */
async function actualizarHorarioDeAsignaciones(
  id_cita, nuevaFechaInicio, nuevaFechaFin, client = db
) {
  const { rowCount } = await client.query(
    `UPDATE cita_trabajadores
        SET fecha_inicio = $1,
            fecha_fin    = $2
      WHERE id_cita = $3`,
    [nuevaFechaInicio, nuevaFechaFin, id_cita]
  );
  return rowCount;
}

/**
 * ¿El trabajador `id_trabajador` está asignado a la cita `id_cita`?
 * Usado por el groomer para "marcar en progreso" / "completar".
 */
async function estaAsignadoACita(id_cita, id_trabajador) {
  const { rows } = await db.query(
    `SELECT 1 FROM cita_trabajadores
      WHERE id_cita = $1 AND id_trabajador = $2 LIMIT 1`,
    [id_cita, id_trabajador]
  );
  return rows.length > 0;
}

/**
 * Encuentra el id_trabajador asociado a un id_usuario (sesión actual).
 * Lo usamos cuando el JWT solo trae id_usuario y necesitamos saber
 * a qué fila de `trabajadores` corresponde.
 */
async function findIdTrabajadorByUsuario(id_usuario) {
  const { rows } = await db.query(
    `SELECT id_trabajador FROM trabajadores WHERE id_usuario = $1 LIMIT 1`,
    [id_usuario]
  );
  return rows[0]?.id_trabajador || null;
}

module.exports = {
  asignarGroomer,
  listGroomersDeCita,
  clearGroomersDeCita,
  actualizarHorarioDeAsignaciones,
  estaAsignadoACita,
  findIdTrabajadorByUsuario,
};
