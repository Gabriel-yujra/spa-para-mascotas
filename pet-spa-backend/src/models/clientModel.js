// src/models/clientModel.js
const db = require('../config/db');

async function createClient(
  { id_usuario, telefono, direccion, ci, canal_notificacion = null, horarios_preferidos = null },
  client = db
) {
  const { rows } = await client.query(
    `INSERT INTO clientes
       (id_usuario, telefono, direccion, ci, canal_notificacion, horarios_preferidos)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_cliente, id_usuario, telefono, direccion, ci, canal_notificacion, horarios_preferidos`,
    [id_usuario, telefono, direccion, ci, canal_notificacion, horarios_preferidos]
  );
  return rows[0];
}

async function findClientByUserId(id_usuario) {
  const { rows } = await db.query(
    `SELECT id_cliente, id_usuario, telefono, direccion, ci,
            canal_notificacion, horarios_preferidos
       FROM clientes
      WHERE id_usuario = $1
      LIMIT 1`,
    [id_usuario]
  );
  return rows[0] || null;
}

module.exports = {
  createClient,
  findClientByUserId,
};
