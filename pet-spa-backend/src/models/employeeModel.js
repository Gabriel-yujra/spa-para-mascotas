// src/models/employeeModel.js
const db = require('../config/db');

async function createEmployee(
  { id_usuario, sueldo_mensual, turno, telefono, especialidad, capacidad_simultanea, activo = true },
  client = db
) {
  const { rows } = await client.query(
    `INSERT INTO trabajadores
       (id_usuario, sueldo_mensual, activo, turno, telefono, especialidad, capacidad_simultanea)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_trabajador, id_usuario, sueldo_mensual, activo, turno,
               telefono, especialidad, capacidad_simultanea`,
    [id_usuario, sueldo_mensual, activo, turno, telefono, especialidad, capacidad_simultanea]
  );
  return rows[0];
}

/**
 * Lista empleados con datos del usuario y su rol.
 */
async function listEmployees() {
  const { rows } = await db.query(
    `SELECT t.id_trabajador, t.id_usuario, t.sueldo_mensual, t.activo,
            t.turno, t.telefono, t.especialidad, t.capacidad_simultanea,
            u.nombre, u.email, u.estado, u.ultimo_acceso,
            r.id_rol, r.name AS rol_name
       FROM trabajadores t
       JOIN usuarios u ON u.id_usuario = t.id_usuario
       JOIN roles r ON r.id_rol = u.id_rol
      ORDER BY u.nombre ASC`
  );
  return rows;
}

async function findEmployeeById(id_trabajador) {
  const { rows } = await db.query(
    `SELECT t.id_trabajador, t.id_usuario, t.sueldo_mensual, t.activo,
            t.turno, t.telefono, t.especialidad, t.capacidad_simultanea,
            u.nombre, u.email, u.estado,
            r.name AS rol_name
       FROM trabajadores t
       JOIN usuarios u ON u.id_usuario = t.id_usuario
       JOIN roles r ON r.id_rol = u.id_rol
      WHERE t.id_trabajador = $1
      LIMIT 1`,
    [id_trabajador]
  );
  return rows[0] || null;
}

/**
 * Actualiza dinámicamente solo los campos enviados de la tabla trabajadores.
 * fields esperados: { activo, turno, especialidad, capacidad_simultanea, sueldo_mensual, telefono }
 */
async function updateEmployee(id_trabajador, fields) {
  const allowed = ['activo', 'turno', 'especialidad', 'capacidad_simultanea', 'sueldo_mensual', 'telefono'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = $${idx}`);
      values.push(fields[key]);
      idx++;
    }
  }

  if (sets.length === 0) return null;

  values.push(id_trabajador);
  const sql = `UPDATE trabajadores
                  SET ${sets.join(', ')}
                WHERE id_trabajador = $${idx}
            RETURNING id_trabajador, id_usuario, sueldo_mensual, activo,
                      turno, telefono, especialidad, capacidad_simultanea`;
  const { rows } = await db.query(sql, values);
  return rows[0] || null;
}

module.exports = {
  createEmployee,
  listEmployees,
  findEmployeeById,
  updateEmployee,
};
