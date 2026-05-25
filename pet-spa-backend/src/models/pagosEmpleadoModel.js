// src/models/pagosEmpleadoModel.js
const db = require('../config/db');

async function createPago({ id_trabajador, monto, periodo_desde, periodo_hasta, descripcion }) {
  const { rows } = await db.query(
    `INSERT INTO pagos_empleados
       (id_trabajador, monto, fecha_pago, periodo_desde, periodo_hasta, estado, descripcion)
     VALUES ($1, $2, NOW(), $3, $4, 'pagado', $5)
     RETURNING *`,
    [id_trabajador, parseFloat(monto), periodo_desde, periodo_hasta, descripcion || null]
  );
  return rows[0];
}

async function listPagos({ id_trabajador, desde, hasta } = {}) {
  const where = [];
  const params = [];
  let i = 1;
  if (id_trabajador) { where.push(`p.id_trabajador = $${i++}`); params.push(id_trabajador); }
  if (desde)         { where.push(`p.fecha_pago >= $${i++}`);   params.push(desde); }
  if (hasta)         { where.push(`p.fecha_pago <= $${i++}`);   params.push(hasta); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT p.*, u.nombre AS nombre_trabajador
       FROM pagos_empleados p
       JOIN trabajadores t ON t.id_trabajador = p.id_trabajador
       JOIN usuarios     u ON u.id_usuario     = t.id_usuario
     ${whereSql}
     ORDER BY p.fecha_pago DESC`,
    params
  );
  return rows;
}

module.exports = { createPago, listPagos };
