// src/models/mascotaVacunaModel.js
// Solo SQL. Consultas sobre `vacunas` (catálogo) y `mascota_vacunas` (por mascota).
const db = require('../config/db');

async function findAllVacunasCatalogo() {
  const { rows } = await db.query(
    `SELECT id_vacuna, nombre, descripcion FROM vacunas ORDER BY nombre ASC`
  );
  return rows;
}

async function findVacunasByMascota(id_mascota) {
  const { rows } = await db.query(
    `SELECT mv.id_mascota_vacuna, mv.id_mascota, mv.id_vacuna,
            v.nombre AS nombre_vacuna, v.descripcion AS descripcion_vacuna,
            mv.fecha_aplicacion, mv.fecha_proxima, mv.observaciones
       FROM mascota_vacunas mv
       JOIN vacunas v ON v.id_vacuna = mv.id_vacuna
      WHERE mv.id_mascota = $1
      ORDER BY mv.fecha_aplicacion DESC`,
    [id_mascota]
  );
  return rows;
}

async function createVacunaForMascota({
  id_mascota, id_vacuna, fecha_aplicacion,
  fecha_proxima = null, observaciones = null,
}) {
  const { rows } = await db.query(
    `INSERT INTO mascota_vacunas
       (id_mascota, id_vacuna, fecha_aplicacion, fecha_proxima, observaciones)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_mascota_vacuna, id_mascota, id_vacuna,
               fecha_aplicacion, fecha_proxima, observaciones`,
    [id_mascota, id_vacuna, fecha_aplicacion, fecha_proxima, observaciones]
  );
  return rows[0];
}

async function deleteVacunaMascota(id_mascota_vacuna) {
  const { rowCount } = await db.query(
    `DELETE FROM mascota_vacunas WHERE id_mascota_vacuna = $1`,
    [id_mascota_vacuna]
  );
  return rowCount > 0;
}

module.exports = {
  findAllVacunasCatalogo,
  findVacunasByMascota,
  createVacunaForMascota,
  deleteVacunaMascota,
};
