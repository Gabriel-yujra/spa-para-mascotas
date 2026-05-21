// src/models/clienteModel.js
// Solo SQL. Consultas sobre `clientes` y el join con `usuarios`.
// Jamás importa Express. Recibe parámetros de negocio, devuelve datos.
const db = require('../config/db');

// ─────────────────────────────────────────────────────────────
// Selects base (columnas que devolvemos al cliente o al staff)
// ─────────────────────────────────────────────────────────────
const CAMPOS_PERFIL_CLIENTE = `
  c.id_cliente, c.id_usuario,
  c.telefono, c.direccion, c.ci,
  c.canal_notificacion, c.horarios_preferidos,
  u.nombre, u.email, u.estado AS estado_usuario
`;

/**
 * Perfil de cliente a partir del id_usuario del JWT.
 * Es el punto de entrada principal para "GET /api/clientes/me".
 */
async function findPerfilByUsuario(id_usuario) {
  const { rows } = await db.query(
    `SELECT ${CAMPOS_PERFIL_CLIENTE}
       FROM clientes c
       JOIN usuarios u ON u.id_usuario = c.id_usuario
      WHERE c.id_usuario = $1
      LIMIT 1`,
    [id_usuario]
  );
  return rows[0] || null;
}

/**
 * Perfil de cliente a partir del id_cliente.
 * Usado por staff (recepción/admin) para ver fichas.
 */
async function findClienteById(id_cliente) {
  const { rows } = await db.query(
    `SELECT ${CAMPOS_PERFIL_CLIENTE}
       FROM clientes c
       JOIN usuarios u ON u.id_usuario = c.id_usuario
      WHERE c.id_cliente = $1
      LIMIT 1`,
    [id_cliente]
  );
  return rows[0] || null;
}

/**
 * Obtiene solo el id_cliente a partir del id_usuario del JWT.
 * Helper para no repetir el JOIN en cada operación.
 */
async function findIdClienteByUsuario(id_usuario) {
  const { rows } = await db.query(
    `SELECT id_cliente FROM clientes WHERE id_usuario = $1 LIMIT 1`,
    [id_usuario]
  );
  return rows[0]?.id_cliente || null;
}

/**
 * Actualiza los campos editables por el propio cliente.
 * Solo permite los campos de la tabla `clientes`; nombre/email no están aquí.
 */
async function updatePerfil(id_cliente, fields, client = db) {
  const allowed = ['telefono', 'direccion', 'ci', 'canal_notificacion', 'horarios_preferidos'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) {
      sets.push(`${k} = $${idx++}`);
      values.push(fields[k]);
    }
  }
  if (sets.length === 0) return null;

  values.push(id_cliente);
  const { rows } = await client.query(
    `UPDATE clientes
        SET ${sets.join(', ')}
      WHERE id_cliente = $${idx}
      RETURNING id_cliente, telefono, direccion, ci, canal_notificacion, horarios_preferidos`,
    values
  );
  return rows[0] || null;
}

/**
 * Permite al staff actualizar el nombre en `usuarios`.
 * Solo usado por PUT /api/clientes/:id desde recepción/admin.
 */
async function updateNombreUsuario(id_usuario, nombre, client = db) {
  const { rows } = await client.query(
    `UPDATE usuarios
        SET nombre = $1
      WHERE id_usuario = $2
      RETURNING id_usuario, nombre`,
    [nombre, id_usuario]
  );
  return rows[0] || null;
}

/**
 * Búsqueda de clientes para recepción/admin con filtros opcionales.
 * Devuelve datos básicos + cantidad de mascotas.
 * Filtros: nombre (ilike), email (ilike), ci, telefono.
 */
async function searchClientes({ nombre, email, ci, telefono } = {}) {
  const where = [];
  const params = [];
  let idx = 1;

  if (nombre)   { where.push(`u.nombre    ILIKE $${idx++}`); params.push(`%${nombre}%`); }
  if (email)    { where.push(`u.email     ILIKE $${idx++}`); params.push(`%${email}%`); }
  if (ci)       { where.push(`c.ci        ILIKE $${idx++}`); params.push(`%${ci}%`); }
  if (telefono) { where.push(`c.telefono  ILIKE $${idx++}`); params.push(`%${telefono}%`); }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT c.id_cliente, c.id_usuario, c.telefono, c.ci,
            u.nombre, u.email, u.estado AS estado_usuario,
            (SELECT COUNT(*) FROM mascotas m WHERE m.id_cliente = c.id_cliente)::int AS total_mascotas
       FROM clientes c
       JOIN usuarios u ON u.id_usuario = c.id_usuario
      ${whereSql}
      ORDER BY u.nombre ASC`,
    params
  );
  return rows;
}

/**
 * Crea la fila `clientes` vinculada a un usuario existente.
 * La creación del `usuario` en sí es responsabilidad de userModel.createUser.
 */
async function createCliente(
  { id_usuario, telefono = null, direccion = null, ci = null,
    canal_notificacion = null, horarios_preferidos = null },
  client = db
) {
  const { rows } = await client.query(
    `INSERT INTO clientes
       (id_usuario, telefono, direccion, ci, canal_notificacion, horarios_preferidos)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_cliente, id_usuario, telefono, direccion, ci,
               canal_notificacion, horarios_preferidos`,
    [id_usuario, telefono, direccion, ci, canal_notificacion, horarios_preferidos]
  );
  return rows[0];
}

module.exports = {
  findPerfilByUsuario,
  findClienteById,
  findIdClienteByUsuario,
  updatePerfil,
  updateNombreUsuario,
  searchClientes,
  createCliente,
};