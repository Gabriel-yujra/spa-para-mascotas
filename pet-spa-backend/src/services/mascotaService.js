// src/services/mascotaService.js
// Lógica de negocio para el módulo de mascotas.
// Orquesta clienteModel y mascotaModel; no importa Express.
// Usa transacción en operaciones que podrían involucrar varias tablas en el futuro.
const clienteModel = require('../models/clienteModel');
const mascotaModel = require('../models/mascotaModel');
const mascotaVacunaModel = require('../models/mascotaVacunaModel');

class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/**
 * Resuelve el id_cliente a partir del id_usuario del JWT.
 * Lanza 404 si el usuario no tiene perfil de cliente.
 */
async function resolverIdCliente(idUsuario) {
  const idCliente = await clienteModel.findIdClienteByUsuario(idUsuario);
  if (!idCliente) throw new ServiceError(404, 'Perfil de cliente no encontrado');
  return idCliente;
}

/**
 * Verifica que la mascota exista y pertenezca al cliente.
 * Lanza 404 si no existe, 403 si pertenece a otro cliente.
 */
async function assertMascotaDelCliente(idMascota, idCliente) {
  const mascota = await mascotaModel.findMascotaById(idMascota);
  if (!mascota || !mascota.activo) throw new ServiceError(404, 'Mascota no encontrada');
  if (mascota.id_cliente !== idCliente) throw new ServiceError(403, 'La mascota no pertenece al cliente autenticado');
  return mascota;
}

/**
 * Lista todas las mascotas activas del usuario autenticado.
 */
async function getMascotasByUsuario(idUsuario) {
  const idCliente = await resolverIdCliente(idUsuario);
  return mascotaModel.findMascotasByCliente(idCliente);
}

/**
 * Crea una mascota para el usuario autenticado.
 * Valida que el campo `nombre` esté presente.
 */
async function createMascotaForUsuario(idUsuario, data) {
  if (!data.nombre || !String(data.nombre).trim()) {
    throw new ServiceError(400, 'El nombre de la mascota es obligatorio');
  }
  const idCliente = await resolverIdCliente(idUsuario);
  return mascotaModel.createMascota({ ...data, id_cliente: idCliente });
}

/**
 * Actualiza una mascota del usuario autenticado.
 * Lanza 400 si no se pasan campos actualizables.
 */
async function updateMascotaForUsuario(idUsuario, idMascota, data) {
  const idCliente = await resolverIdCliente(idUsuario);
  await assertMascotaDelCliente(idMascota, idCliente);

  const actualizada = await mascotaModel.updateMascota(idMascota, data);
  if (!actualizada) throw new ServiceError(400, 'No se proporcionaron campos válidos para actualizar');
  return actualizada;
}

/**
 * Elimina (soft-delete) una mascota del usuario autenticado.
 * Lanza 409 si la mascota tiene citas activas (no terminales).
 */
async function deleteMascotaForUsuario(idUsuario, idMascota) {
  const idCliente = await resolverIdCliente(idUsuario);
  await assertMascotaDelCliente(idMascota, idCliente);

  const tieneActivas = await mascotaModel.hasCitasActivas(idMascota);
  if (tieneActivas) {
    throw new ServiceError(409, 'No se puede eliminar una mascota con citas activas. Cancela o completa las citas primero.');
  }

  await mascotaModel.softDeleteMascota(idMascota);
}

/**
 * Lookup any pet by PK — for staff (ADMIN, RECEPCION, GROOMER, etc.).
 * No ownership check; the route layer enforces the role.
 * Throws 404 if the mascota doesn't exist.
 */
async function getMascotaById(idMascota) {
  const mascota = await mascotaModel.findMascotaById(idMascota);
  if (!mascota) throw new ServiceError(404, 'Mascota no encontrada');
  return mascota;
}

/**
 * Actualiza foto_url de una mascota.
 * Para CLIENTE valida que la mascota le pertenezca.
 * Para STAFF solo comprueba que exista.
 * rolName: valor raw del JWT (ej. 'cliente', 'admin').
 */
async function uploadFotoMascota(idUsuario, rolName, idMascota, fotoUrl) {
  if (rolName === 'cliente') {
    const idCliente = await resolverIdCliente(idUsuario);
    await assertMascotaDelCliente(idMascota, idCliente);
  } else {
    const mascota = await mascotaModel.findMascotaById(idMascota);
    if (!mascota) throw new ServiceError(404, 'Mascota no encontrada');
  }
  const actualizada = await mascotaModel.updateMascota(idMascota, { foto_url: fotoUrl });
  if (!actualizada) throw new ServiceError(500, 'No se pudo actualizar la foto');
  return actualizada;
}

// ──────────────────────────────────────────────
// Vacunas
// ──────────────────────────────────────────────

async function getVacunasCatalogo() {
  return mascotaVacunaModel.findAllVacunasCatalogo();
}

async function getVacunasByMascota(idUsuario, rolName, idMascota) {
  if (rolName === 'cliente') {
    const idCliente = await resolverIdCliente(idUsuario);
    await assertMascotaDelCliente(idMascota, idCliente);
  } else {
    const mascota = await mascotaModel.findMascotaById(idMascota);
    if (!mascota) throw new ServiceError(404, 'Mascota no encontrada');
  }
  return mascotaVacunaModel.findVacunasByMascota(idMascota);
}

async function createVacunaForMascota(idUsuario, rolName, idMascota, data) {
  if (rolName === 'cliente') {
    const idCliente = await resolverIdCliente(idUsuario);
    await assertMascotaDelCliente(idMascota, idCliente);
  } else {
    const mascota = await mascotaModel.findMascotaById(idMascota);
    if (!mascota) throw new ServiceError(404, 'Mascota no encontrada');
  }
  const { id_vacuna, fecha_aplicacion, fecha_proxima, observaciones } = data || {};
  if (!id_vacuna)        throw new ServiceError(400, 'id_vacuna es obligatorio');
  if (!fecha_aplicacion) throw new ServiceError(400, 'fecha_aplicacion es obligatoria');

  return mascotaVacunaModel.createVacunaForMascota({
    id_mascota: idMascota,
    id_vacuna,
    fecha_aplicacion,
    fecha_proxima:  fecha_proxima  || null,
    observaciones:  observaciones  || null,
  });
}

async function deleteVacunaForMascota(idUsuario, rolName, idMascota, idMascotaVacuna) {
  if (rolName === 'cliente') {
    const idCliente = await resolverIdCliente(idUsuario);
    await assertMascotaDelCliente(idMascota, idCliente);
  }
  const ok = await mascotaVacunaModel.deleteVacunaMascota(idMascotaVacuna);
  if (!ok) throw new ServiceError(404, 'Registro de vacuna no encontrado');
}

module.exports = {
  getMascotasByUsuario,
  getMascotaById,
  createMascotaForUsuario,
  updateMascotaForUsuario,
  deleteMascotaForUsuario,
  uploadFotoMascota,
  getVacunasCatalogo,
  getVacunasByMascota,
  createVacunaForMascota,
  deleteVacunaForMascota,
};
