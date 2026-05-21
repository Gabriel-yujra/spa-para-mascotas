// src/models/trabajadorModel.js
// Listado de groomers activos con su capacidad simultánea.
const db = require('../config/db');

/**
 * Devuelve todos los trabajadores activos que pueden tomar citas.
 * Incluye el nombre del usuario para mostrarlo en la UI.
 */
async function listGroomersActivos() {
  const { rows } = await db.query(
    `SELECT t.id_trabajador, t.id_usuario, t.especialidad,
            COALESCE(t.capacidad_simultanea, 1) AS capacidad_simultanea,
            t.turno, t.telefono,
            u.nombre AS nombre_usuario
       FROM trabajadores t
       JOIN usuarios u ON u.id_usuario = t.id_usuario
       JOIN roles    r ON r.id_rol     = u.id_rol
      WHERE t.activo = TRUE
        AND u.estado = 'activo'
        AND r.name   = 'groomer'
      ORDER BY u.nombre ASC`
  );
  return rows;
}

async function findTrabajadorById(id_trabajador) {
  const { rows } = await db.query(
    `SELECT t.id_trabajador, t.id_usuario, t.activo,
            COALESCE(t.capacidad_simultanea, 1) AS capacidad_simultanea,
            t.especialidad, t.turno, u.nombre AS nombre_usuario
       FROM trabajadores t
       JOIN usuarios u ON u.id_usuario = t.id_usuario
      WHERE t.id_trabajador = $1
      LIMIT 1`,
    [id_trabajador]
  );
  return rows[0] || null;
}

async function findTrabajadorByUsuario(id_usuario) {
  const { rows } = await db.query(
    `SELECT t.id_trabajador, t.id_usuario, t.activo,
            COALESCE(t.capacidad_simultanea, 1) AS capacidad_simultanea,
            t.especialidad, t.turno, u.nombre AS nombre_usuario
       FROM trabajadores t
       JOIN usuarios u ON u.id_usuario = t.id_usuario
      WHERE t.id_usuario = $1
        AND t.activo = TRUE
      LIMIT 1`,
    [id_usuario]
  );
  return rows[0] || null;
}

module.exports = { listGroomersActivos, findTrabajadorById, findTrabajadorByUsuario };
