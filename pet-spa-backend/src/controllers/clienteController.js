// src/controllers/clienteController.js
// HTTP layer solo. Delega toda lógica de negocio a clienteService.
// req.user es inyectado por authRequired: { id_usuario, rol_name, ... }
const clienteService = require('../services/clienteService');

// ──────────────────────────────────────────────
// GET /api/clientes/me
// Rol: CLIENTE
// ──────────────────────────────────────────────
exports.getMiPerfil = async (req, res, next) => {
  try {
    const perfil = await clienteService.getMiPerfil(req.user.id_usuario);
    return res.status(200).json({ cliente: perfil });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// PUT /api/clientes/me
// Rol: CLIENTE
// ──────────────────────────────────────────────
exports.updateMiPerfil = async (req, res, next) => {
  try {
    const actualizado = await clienteService.updateMiPerfil(req.user.id_usuario, req.body || {});
    return res.status(200).json({ message: 'Perfil actualizado', cliente: actualizado });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// GET /api/clientes?nombre=&email=&ci=&telefono=
// Rol: RECEPCION, ADMIN, JEFE
// ──────────────────────────────────────────────
exports.buscarClientes = async (req, res, next) => {
  try {
    const { nombre, email, ci, telefono } = req.query || {};
    const clientes = await clienteService.buscarClientes({ nombre, email, ci, telefono });
    return res.status(200).json({ clientes });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// GET /api/clientes/:idCliente
// Rol: RECEPCION, ADMIN, JEFE
// ──────────────────────────────────────────────
exports.getDetalleCliente = async (req, res, next) => {
  try {
    const cliente = await clienteService.getDetalleCliente(req.params.idCliente);
    return res.status(200).json({ cliente });
  } catch (err) {
    next(err);
  }
};
