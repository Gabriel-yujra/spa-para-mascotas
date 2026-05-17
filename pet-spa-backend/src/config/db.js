// src/config/db.js
// Conexión a PostgreSQL (BD pet_spa) usando pg con pool
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'pet_spa',
  max: 20,                  // máx. conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  // Solo log en desarrollo para no saturar producción
  if (process.env.NODE_ENV !== 'production') {
    console.log('📦 PostgreSQL pool: nueva conexión establecida');
  }
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en cliente PostgreSQL', err);
  process.exit(-1);
});

/**
 * Helper para queries.
 * Uso: const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1', [id])
 */
module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // útil para transacciones
  pool,
};
