// src/models/rolesModel.js
const db = require('../config/db');

async function findRoleByName(name) {
  const { rows } = await db.query(
    'SELECT id_rol, name, description FROM roles WHERE name = $1 LIMIT 1',
    [name]
  );
  return rows[0] || null;
}

async function findRoleById(id_rol) {
  const { rows } = await db.query(
    'SELECT id_rol, name, description FROM roles WHERE id_rol = $1 LIMIT 1',
    [id_rol]
  );
  return rows[0] || null;
}

async function listRoles() {
  const { rows } = await db.query(
    'SELECT id_rol, name, description FROM roles ORDER BY name ASC'
  );
  return rows;
}

module.exports = {
  findRoleByName,
  findRoleById,
  listRoles,
};
