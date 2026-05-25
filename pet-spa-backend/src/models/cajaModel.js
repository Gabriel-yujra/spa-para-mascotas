// src/models/cajaModel.js
const db = require('../config/db');

async function findCajaActiva() {
  const { rows } = await db.query(
    `SELECT * FROM cajas WHERE estado = 'activa' ORDER BY id_caja LIMIT 1`
  );
  return rows[0] || null;
}

async function createCaja({ nombre, descripcion }) {
  const { rows } = await db.query(
    `INSERT INTO cajas (nombre, descripcion, estado, saldo_actual)
     VALUES ($1, $2, 'activa', 0)
     RETURNING *`,
    [nombre, descripcion || null]
  );
  return rows[0];
}

async function cerrarCaja(id_caja) {
  const { rows } = await db.query(
    `UPDATE cajas SET estado = 'cerrada' WHERE id_caja = $1 RETURNING *`,
    [id_caja]
  );
  return rows[0] || null;
}

async function createTransaccion({ id_caja, tipo, monto, descripcion, id_usuario_solicita, id_referencia = null, metodo_pago = null }, client = db) {
  const { rows } = await client.query(
    `INSERT INTO transacciones
       (id_caja, tipo, monto, descripcion, id_usuario_solicita, id_referencia,
        estado_admin, estado_jefe, estado_global,
        fecha_aprobacion_admin, fecha_aprobacion_jefe, metodo_pago)
     VALUES ($1, $2, $3, $4, $5, $6,
             'aprobada', 'aprobada', 'aprobada',
             NOW(), NOW(), $7)
     RETURNING *`,
    [id_caja, tipo, parseFloat(monto), descripcion || null, id_usuario_solicita, id_referencia, metodo_pago || null]
  );
  const delta = tipo === 'INGRESO' ? parseFloat(monto) : -parseFloat(monto);
  await client.query(
    `UPDATE cajas SET saldo_actual = saldo_actual + $2 WHERE id_caja = $1`,
    [id_caja, delta]
  );
  return rows[0];
}

async function listTransacciones(id_caja) {
  const { rows } = await db.query(
    `SELECT t.*, u.nombre AS nombre_usuario
       FROM transacciones t
       LEFT JOIN usuarios u ON u.id_usuario = t.id_usuario_solicita
      WHERE t.id_caja = $1
      ORDER BY t.fecha_solicitud DESC`,
    [id_caja]
  );
  return rows;
}

async function getCajaResumen(id_caja) {
  const { rows } = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) AS total_ingresos,
       COALESCE(SUM(CASE WHEN tipo = 'EGRESO'  THEN monto ELSE 0 END), 0) AS total_egresos
     FROM transacciones
     WHERE id_caja = $1 AND estado_global = 'aprobada'`,
    [id_caja]
  );
  return rows[0];
}

module.exports = { findCajaActiva, createCaja, cerrarCaja, createTransaccion, listTransacciones, getCajaResumen };
