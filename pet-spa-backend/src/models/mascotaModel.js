// src/models/mascotaModel.js
// Solo SQL. Consultas sobre la tabla `mascotas`.
// Jamás importa Express. Recibe parámetros de negocio, devuelve datos.
//
// Columnas reales en `mascotas` (ver BD/tablas.txt + migraciones aplicadas):
//   id_mascota uuid PK
//   id_cliente uuid FK → clientes
//   nombre text NOT NULL
//   raza text
//   tamano text           -- 'pequeno' | 'mediano' | 'grande' | 'gigante'
//   peso_kg numeric(5,2)
//   fecha_nacimiento date
//   temperamento text
//   notas text
//   alergias text
//   restricciones text
//   foto_url text
//   especie text          -- añadido en 2026-05-mascotas-especie.sql
//   activo boolean        -- añadido en 2026-05-grooming-changes.sql
const db = require('../config/db');

// Columnas devueltas en listados y detalles de mascota.
const CAMPOS_MASCOTA = `
  m.id_mascota, m.id_cliente,
  m.nombre, m.especie, m.raza, m.tamano, m.peso_kg,
  m.fecha_nacimiento, m.temperamento,
  m.notas, m.alergias, m.restricciones, m.foto_url, m.activo
`;

/**
 * Lectura mínima para el cálculo de agenda (usada por agendaService).
 * Mantener esta función para no romper agendaService.
 */
async function findMascotaParaAgenda(id_mascota) {
  const { rows } = await db.query(
    `SELECT id_mascota, id_cliente, nombre, tamano, raza, temperamento
       FROM mascotas
      WHERE id_mascota = $1
      LIMIT 1`,
    [id_mascota]
  );
  return rows[0] || null;
}

/**
 * Todas las mascotas activas de un cliente.
 */
async function findMascotasByCliente(id_cliente) {
  const { rows } = await db.query(
    `SELECT ${CAMPOS_MASCOTA}
       FROM mascotas m
      WHERE m.id_cliente = $1 AND m.activo = true
      ORDER BY m.nombre ASC`,
    [id_cliente]
  );
  return rows;
}

/**
 * Mascota por PK. Devuelve null si no existe.
 */
async function findMascotaById(id_mascota) {
  const { rows } = await db.query(
    `SELECT ${CAMPOS_MASCOTA}
       FROM mascotas m
      WHERE m.id_mascota = $1
      LIMIT 1`,
    [id_mascota]
  );
  return rows[0] || null;
}

/**
 * Crea una mascota asociada a un cliente.
 * Campos obligatorios: id_cliente, nombre.
 * El resto son opcionales.
 */
async function createMascota(
  { id_cliente, nombre, especie = null, raza = null, tamano = null,
    peso_kg = null, fecha_nacimiento = null, temperamento = null,
    notas = null, alergias = null, restricciones = null, foto_url = null },
  client = db
) {
  const { rows } = await client.query(
    `INSERT INTO mascotas
       (id_cliente, nombre, especie, raza, tamano, peso_kg,
        fecha_nacimiento, temperamento, notas, alergias, restricciones, foto_url, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
     RETURNING ${CAMPOS_MASCOTA}`,
    [id_cliente, nombre, especie, raza, tamano, peso_kg,
     fecha_nacimiento, temperamento, notas, alergias, restricciones, foto_url]
  );
  return rows[0];
}

/**
 * Actualiza los campos editables de una mascota.
 * Solo modifica las claves que se pasen en `fields`.
 */
async function updateMascota(id_mascota, fields, client = db) {
  const allowed = ['nombre', 'especie', 'raza', 'tamano', 'peso_kg',
                   'fecha_nacimiento', 'temperamento',
                   'notas', 'alergias', 'restricciones', 'foto_url'];
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

  values.push(id_mascota);
  const { rows } = await client.query(
    `UPDATE mascotas
        SET ${sets.join(', ')}
      WHERE id_mascota = $${idx}
      RETURNING ${CAMPOS_MASCOTA}`,
    values
  );
  return rows[0] || null;
}

/**
 * Soft-delete: marca activo = false.
 */
async function softDeleteMascota(id_mascota, client = db) {
  const { rows } = await client.query(
    `UPDATE mascotas
        SET activo = false
      WHERE id_mascota = $1
      RETURNING id_mascota`,
    [id_mascota]
  );
  return rows[0] || null;
}

/**
 * Comprueba si la mascota tiene citas en estado no terminal
 * (pendiente, confirmada, en_progreso, reprogramada).
 * Úsalo antes de borrar para evitar dejar citas huérfanas.
 */
async function hasCitasActivas(id_mascota) {
  const TERMINALES = ['completada', 'cancelada', 'no_asistio'];
  const placeholders = TERMINALES.map((_, i) => `$${i + 2}`).join(', ');
  const { rows } = await db.query(
    `SELECT 1
       FROM citas
      WHERE id_mascota = $1
        AND estado_global NOT IN (${placeholders})
      LIMIT 1`,
    [id_mascota, ...TERMINALES]
  );
  return rows.length > 0;
}

module.exports = {
  findMascotaParaAgenda,
  findMascotasByCliente,
  findMascotaById,
  createMascota,
  updateMascota,
  softDeleteMascota,
  hasCitasActivas,
};
