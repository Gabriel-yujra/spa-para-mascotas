// src/models/mascotaModel.js
// Lectura mínima de la mascota para calcular la duración ajustada.
//
// ASUNCIÓN: existe (o existirá) una tabla `mascotas` con al menos:
//   id_mascota uuid PK
//   id_cliente uuid
//   nombre text
//   tamano  text   -- p.ej. 'pequeno' | 'mediano' | 'grande' | 'gigante'
//   raza    text
//   temperamento text   -- opcional
//
// Si los nombres de tus columnas son ligeramente distintos (p.ej.
// `tamaño` o `size`), ajusta el SELECT — el resto del módulo solo lee
// las claves devueltas por esta función.
const db = require('../config/db');

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

module.exports = { findMascotaParaAgenda };
