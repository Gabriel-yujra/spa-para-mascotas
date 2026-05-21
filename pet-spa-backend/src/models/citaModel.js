// src/models/citaModel.js
// Solo SQL. Consultas sobre la tabla `citas`.
const db = require('../config/db');

/**
 * Inserta una cita nueva con sus 3 estados iniciales (típicamente 'pendiente').
 * Se acepta `client` opcional para participar en una transacción.
 */
async function createCita(
  {
    id_cliente,
    id_mascota,
    id_servicio,
    fecha_cita,
    estado_empleado = 'pendiente',
    estado_cliente = 'pendiente',
    estado_global = 'pendiente',
  },
  client = db
) {
  const { rows } = await client.query(
    `INSERT INTO citas (id_cliente, id_mascota, id_servicio, fecha_cita,
                        estado_empleado, estado_cliente, estado_global)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_cita, id_cliente, id_mascota, id_servicio, fecha_cita,
               estado_empleado, estado_cliente, estado_global,
               fecha_creacion, fecha_ultima_actualizacion`,
    [id_cliente, id_mascota, id_servicio, fecha_cita,
     estado_empleado, estado_cliente, estado_global]
  );
  return rows[0];
}

/**
 * Devuelve una cita con datos JOIN útiles para mostrar a cualquier rol.
 */
async function findCitaById(id_cita) {
  const { rows } = await db.query(
    `SELECT c.id_cita, c.id_cliente, c.id_mascota, c.id_servicio,
            c.fecha_cita, c.estado_empleado, c.estado_cliente, c.estado_global,
            c.motivo_cancelacion, c.cancelado_por,
            c.terminado_por_empleado, c.conforme_por_cliente,
            c.fecha_creacion, c.fecha_ultima_actualizacion,
            m.nombre AS mascota_nombre, m.tamano AS mascota_tamano,
            s.nombre AS servicio_nombre, s.duracion_estimada_min,
            s.permite_doble_booking,
            cli.id_usuario AS id_usuario_cliente
       FROM citas c
       LEFT JOIN mascotas  m   ON m.id_mascota   = c.id_mascota
       LEFT JOIN servicios s   ON s.id_servicio  = c.id_servicio
       LEFT JOIN clientes  cli ON cli.id_cliente = c.id_cliente
      WHERE c.id_cita = $1
      LIMIT 1`,
    [id_cita]
  );
  return rows[0] || null;
}

/**
 * Listado de citas de un cliente (usado por GET /citas/mis-citas).
 * Filtra por `id_usuario` del cliente logueado, no por `id_cliente` directamente,
 * para evitar que el caller tenga que conocer su id_cliente.
 */
async function listCitasByUsuarioCliente(id_usuario_cliente, { soloFuturas = false } = {}) {
  const params = [id_usuario_cliente];
  let extra = '';
  if (soloFuturas) {
    extra = ` AND c.fecha_cita >= CURRENT_DATE`;
  }
  const { rows } = await db.query(
    `SELECT c.id_cita, c.id_mascota, c.id_servicio, c.fecha_cita,
            c.estado_empleado, c.estado_cliente, c.estado_global,
            m.nombre AS mascota_nombre,
            s.nombre AS servicio_nombre, s.duracion_estimada_min,
            (SELECT MIN(ct.fecha_inicio) FROM cita_trabajadores ct WHERE ct.id_cita = c.id_cita) AS hora_inicio
       FROM citas c
       JOIN clientes  cli ON cli.id_cliente = c.id_cliente
       LEFT JOIN mascotas  m ON m.id_mascota  = c.id_mascota
       LEFT JOIN servicios s ON s.id_servicio = c.id_servicio
      WHERE cli.id_usuario = $1 ${extra}
      ORDER BY c.fecha_cita DESC, hora_inicio DESC NULLS LAST`,
    params
  );
  return rows;
}

/**
 * Bandeja de pendientes (recepción/admin).
 * Filtros opcionales: from, to (rango de fecha_cita), id_servicio.
 */
async function listCitasPendientes({ from = null, to = null, id_servicio = null } = {}) {
  const where = [`c.estado_global = 'pendiente'`];
  const params = [];
  let i = 1;
  if (from)        { where.push(`c.fecha_cita >= $${i++}`); params.push(from); }
  if (to)          { where.push(`c.fecha_cita <= $${i++}`); params.push(to); }
  if (id_servicio) { where.push(`c.id_servicio = $${i++}`); params.push(id_servicio); }

  const { rows } = await db.query(
    `SELECT c.id_cita, c.id_cliente, c.id_mascota, c.id_servicio,
            c.fecha_cita, c.estado_global, c.fecha_creacion,
            m.nombre AS mascota_nombre,
            s.nombre AS servicio_nombre, s.duracion_estimada_min,
            u.nombre AS cliente_nombre, u.email AS cliente_email,
            (SELECT MIN(ct.fecha_inicio) FROM cita_trabajadores ct WHERE ct.id_cita = c.id_cita) AS hora_inicio
       FROM citas c
       LEFT JOIN mascotas  m   ON m.id_mascota   = c.id_mascota
       LEFT JOIN servicios s   ON s.id_servicio  = c.id_servicio
       LEFT JOIN clientes  cli ON cli.id_cliente = c.id_cliente
       LEFT JOIN usuarios  u   ON u.id_usuario   = cli.id_usuario
      WHERE ${where.join(' AND ')}
      ORDER BY c.fecha_cita ASC, hora_inicio ASC NULLS LAST`,
    params
  );
  return rows;
}

/**
 * Bandeja general para recepción/admin.
 * Por defecto excluye estados terminales; acepta filtros opcionales:
 *   fecha (YYYY-MM-DD), estado (único valor), id_trabajador (UUID del groomer).
 */
async function listCitasRecepcion({ fecha = null, estado = null, id_trabajador = null } = {}) {
  const where = [];
  const params = [];
  let i = 1;

  if (fecha) {
    where.push(`c.fecha_cita = $${i++}`);
    params.push(fecha);
  }

  if (estado) {
    where.push(`c.estado_global = $${i++}`);
    params.push(estado);
  } else {
    where.push(`c.estado_global NOT IN ('cancelada', 'completada', 'no_asistio')`);
  }

  if (id_trabajador) {
    where.push(
      `EXISTS (SELECT 1 FROM cita_trabajadores ct_f
                WHERE ct_f.id_cita = c.id_cita
                  AND ct_f.id_trabajador = $${i++})`
    );
    params.push(id_trabajador);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT c.id_cita, c.id_cliente, c.id_mascota, c.id_servicio,
            c.fecha_cita, c.estado_global, c.fecha_creacion,
            c.motivo_cancelacion,
            m.nombre AS mascota_nombre, m.tamano AS mascota_tamano,
            s.nombre AS servicio_nombre, s.duracion_estimada_min,
            u.nombre AS cliente_nombre, u.email AS cliente_email,
            (SELECT MIN(ct.fecha_inicio)
               FROM cita_trabajadores ct
              WHERE ct.id_cita = c.id_cita) AS hora_inicio,
            (SELECT ug.nombre
               FROM cita_trabajadores ct2
               JOIN trabajadores trab ON trab.id_trabajador = ct2.id_trabajador
               JOIN usuarios     ug   ON ug.id_usuario      = trab.id_usuario
              WHERE ct2.id_cita = c.id_cita
              ORDER BY ct2.fecha_inicio ASC
              LIMIT 1) AS groomer_nombre
       FROM citas c
       LEFT JOIN mascotas  m   ON m.id_mascota   = c.id_mascota
       LEFT JOIN servicios s   ON s.id_servicio  = c.id_servicio
       LEFT JOIN clientes  cli ON cli.id_cliente = c.id_cliente
       LEFT JOIN usuarios  u   ON u.id_usuario   = cli.id_usuario
      ${whereSql}
      ORDER BY c.fecha_cita ASC, hora_inicio ASC NULLS LAST`,
    params
  );
  return rows;
}

/**
 * Listado para el groomer: solo las citas a las que está asignado.
 * Filtra por id_trabajador y opcionalmente fecha.
 * Soporta paginación mediante limit/offset.
 */
async function listCitasByTrabajador(
  id_trabajador,
  { fecha = null, limit = 10, offset = 0 } = {}
) {
  const params = [id_trabajador];
  let dateFilter = '';
  if (fecha) {
    params.push(fecha);
    dateFilter = ` AND c.fecha_cita = $${params.length}`;
  }
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await db.query(
    `SELECT DISTINCT
            c.id_cita, c.id_cliente, c.id_mascota, c.id_servicio,
            c.fecha_cita, c.estado_empleado, c.estado_global,
            m.nombre AS mascota_nombre, m.tamano AS mascota_tamano,
            m.alergias AS mascota_alergias,
            m.restricciones AS mascota_restricciones,
            m.temperamento AS mascota_temperamento,
            m.notas AS mascota_notas,
            s.nombre AS servicio_nombre, s.duracion_estimada_min,
            u.nombre AS cliente_nombre,
            ct.fecha_inicio, ct.fecha_fin
       FROM citas c
       JOIN cita_trabajadores ct ON ct.id_cita = c.id_cita
       LEFT JOIN mascotas  m   ON m.id_mascota   = c.id_mascota
       LEFT JOIN servicios s   ON s.id_servicio  = c.id_servicio
       LEFT JOIN clientes  cli ON cli.id_cliente = c.id_cliente
       LEFT JOIN usuarios  u   ON u.id_usuario   = cli.id_usuario
      WHERE ct.id_trabajador = $1${dateFilter}
        AND c.estado_global <> 'cancelada'
      ORDER BY ct.fecha_inicio ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );
  return rows;
}

/**
 * UPDATE genérico de la cita. Solo cambia estado y campos relacionados,
 * NO la fecha (la reprogramación tiene su propia función para mantener
 * fecha_anterior/fecha_nueva en cita_movimientos).
 *
 * fields esperados (todos opcionales):
 *   estado_empleado, estado_cliente, estado_global,
 *   motivo_cancelacion, cancelado_por,
 *   terminado_por_empleado, conforme_por_cliente
 */
async function updateCitaCampos(id_cita, fields, client = db) {
  const allowed = [
    'estado_empleado', 'estado_cliente', 'estado_global',
    'motivo_cancelacion', 'cancelado_por',
    'terminado_por_empleado', 'conforme_por_cliente',
  ];
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

  // Siempre tocamos fecha_ultima_actualizacion
  sets.push(`fecha_ultima_actualizacion = NOW()`);

  values.push(id_cita);
  const sql = `UPDATE citas SET ${sets.join(', ')}
                WHERE id_cita = $${idx}
            RETURNING id_cita, estado_empleado, estado_cliente, estado_global,
                      motivo_cancelacion, cancelado_por,
                      terminado_por_empleado, conforme_por_cliente,
                      fecha_cita, fecha_ultima_actualizacion`;
  const { rows } = await client.query(sql, values);
  return rows[0] || null;
}

/**
 * Cambia `fecha_cita` (reprogramación). Devuelve fecha_anterior y la fila.
 */
async function updateFechaCita(id_cita, nuevaFecha, client = db) {
  const { rows } = await client.query(
    `UPDATE citas
        SET fecha_cita = $1,
            fecha_ultima_actualizacion = NOW()
      WHERE id_cita = $2
      RETURNING id_cita, fecha_cita`,
    [nuevaFecha, id_cita]
  );
  return rows[0] || null;
}

module.exports = {
  createCita,
  findCitaById,
  listCitasByUsuarioCliente,
  listCitasPendientes,
  listCitasRecepcion,
  listCitasByTrabajador,
  updateCitaCampos,
  updateFechaCita,
};
