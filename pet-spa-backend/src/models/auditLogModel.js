// src/models/auditLogModel.js
// REEMPLAZO completo: añade findLogs con filtros + paginación.
const db = require('../config/db');

async function logAction(
  { id_usuario = null, accion, detalle = null, ip_address = null, user_agent = null },
  client = db
) {
  try {
    await client.query(
      `INSERT INTO audit_log (id_usuario, accion, detalle, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [id_usuario, accion, detalle, ip_address, user_agent]
    );
  } catch (err) {
    console.error('[audit_log] No se pudo registrar la acción:', err.message);
  }
}

async function getLogsByUser(id_usuario, limit = 50) {
  const { rows } = await db.query(
    `SELECT id_log, id_usuario, accion, detalle, ip_address, user_agent, fecha
       FROM audit_log
      WHERE id_usuario = $1
      ORDER BY fecha DESC
      LIMIT $2`,
    [id_usuario, limit]
  );
  return rows;
}

/**
 * findLogs con filtros + paginación.
 * filters: { from, to, accion, id_usuario, page, pageSize }
 *  - from, to: ISO date strings (opcional)
 *  - accion: string exacto (opcional)
 *  - id_usuario: UUID (opcional)
 *  - page: número 1-based, default 1
 *  - pageSize: default 50, max 200
 *
 * Devuelve: { items, page, pageSize, total }
 */
async function findLogs(filters = {}) {
  const {
    from = null,
    to = null,
    accion = null,
    id_usuario = null,
  } = filters;

  let page = parseInt(filters.page, 10);
  let pageSize = parseInt(filters.pageSize, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 50;
  if (pageSize > 200) pageSize = 200;
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];
  let i = 1;

  if (from)       { where.push(`a.fecha >= $${i++}`); params.push(from); }
  if (to)         { where.push(`a.fecha <= $${i++}`); params.push(to); }
  if (accion)     { where.push(`a.accion = $${i++}`); params.push(accion); }
  if (id_usuario) { where.push(`a.id_usuario = $${i++}`); params.push(id_usuario); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Total para paginación
  const totalSql = `SELECT COUNT(*)::int AS total FROM audit_log a ${whereSql}`;
  const { rows: totalRows } = await db.query(totalSql, params);
  const total = totalRows[0].total;

  // Página de datos con join opcional a usuarios + roles
  const dataSql = `
    SELECT a.id_log, a.id_usuario, a.accion, a.detalle,
           a.ip_address, a.user_agent, a.fecha,
           u.nombre   AS nombre_usuario,
           u.email    AS email_usuario,
           r.name     AS nombre_rol
      FROM audit_log a
      LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
      LEFT JOIN roles    r ON r.id_rol     = u.id_rol
     ${whereSql}
     ORDER BY a.fecha DESC
     LIMIT $${i++} OFFSET $${i++}
  `;
  const { rows: items } = await db.query(dataSql, [...params, pageSize, offset]);

  return { items, page, pageSize, total };
}

module.exports = {
  logAction,
  getLogsByUser,
  findLogs,
};
