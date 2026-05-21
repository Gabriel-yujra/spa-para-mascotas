// src/services/clienteService.js
// Lógica de negocio para el módulo de clientes.
// Orquesta clienteModel; no importa Express.
const clienteModel = require('../models/clienteModel');
const mascotaModel = require('../models/mascotaModel');

class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/**
 * Devuelve el perfil completo (join clientes + usuarios) del usuario autenticado.
 * Lanza 404 si el usuario no tiene fila en `clientes`.
 */
async function getMiPerfil(idUsuario) {
  const perfil = await clienteModel.findPerfilByUsuario(idUsuario);
  if (!perfil) throw new ServiceError(404, 'Perfil de cliente no encontrado');
  return perfil;
}

/**
 * Actualiza los campos editables del propio cliente.
 * Solo permite los campos que clienteModel.updatePerfil acepta.
 * Lanza 404 si no se encuentra la fila, 400 si no se envió ningún campo válido.
 */
async function updateMiPerfil(idUsuario, data) {
  const cliente = await clienteModel.findIdClienteByUsuario(idUsuario);
  if (!cliente) throw new ServiceError(404, 'Perfil de cliente no encontrado');

  const actualizado = await clienteModel.updatePerfil(cliente, data);
  if (!actualizado) throw new ServiceError(400, 'No se proporcionaron campos válidos para actualizar');

  return actualizado;
}

/**
 * Búsqueda paginada de clientes para recepción/admin.
 * Filtros opcionales: nombre, email, ci, telefono.
 */
async function buscarClientes(filtros = {}) {
  return clienteModel.searchClientes(filtros);
}

/**
 * Detalle de un cliente por id_cliente, incluyendo sus mascotas activas.
 * Usado por staff (recepción/admin) para ver la ficha completa.
 * Lanza 404 si no existe.
 * Devuelve { cliente, mascotas }.
 */
async function getDetalleCliente(idCliente) {
  const cliente = await clienteModel.findClienteById(idCliente);
  if (!cliente) throw new ServiceError(404, 'Cliente no encontrado');
  const mascotas = await mascotaModel.findMascotasByCliente(idCliente);
  return { cliente, mascotas };
}

module.exports = {
  getMiPerfil,
  updateMiPerfil,
  buscarClientes,
  getDetalleCliente,
};
