// src/models/citaMovimientoModel.js
// Historial de cambios sobre una cita (cita_movimientos).
const db = require('../config/db');

/**
 * Registra un movimiento. fecha_nueva es obligatoria por schema; cuando el
 * movimiento no implica un cambio de fecha (p.ej. confirmación), pasamos
 * la fecha actual de la cita como `fecha_nueva` y dejamos `fecha_anterior` null.
 *
 * NUNCA debería romper el flujo principal: si falla el log, se loggea y se
 * deja al controller decidir (igual que auditLogModel).
 */
async function logMovimiento(
  {
    id_cita,
    tipo_movimiento,
    fecha_anterior = null,
    fecha_nueva,
    id_usuario_origen,
    descripcion = null,
  },
  client = db
) {
  try {
    await client.query(
      `INSERT INTO cita_movimientos
         (id_cita, tipo_movimiento, fecha_anterior, fecha_nueva,
          id_usuario_origen, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id_cita, tipo_movimiento, fecha_anterior, fecha_nueva,
       id_usuario_origen, descripcion]
    );
  } catch (err) {
    console.error('[cita_movimientos] no se pudo registrar:', err.message);
  }
}

async function listMovimientosDeCita(id_cita) {
  const { rows } = await db.query(
    `SELECT m.id_movimiento, m.tipo_movimiento,
            m.fecha_anterior, m.fecha_nueva,
            m.id_usuario_origen, u.nombre AS nombre_usuario_origen,
            m.descripcion, m.fecha_registro
       FROM cita_movimientos m
       LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario_origen
      WHERE m.id_cita = $1
      ORDER BY m.fecha_registro DESC`,
    [id_cita]
  );
  return rows;
}

module.exports = { logMovimiento, listMovimientosDeCita };
