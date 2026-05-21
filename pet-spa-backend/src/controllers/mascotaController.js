// src/controllers/mascotaController.js
// HTTP layer solo. Delega toda lógica de negocio a mascotaService.
// req.user es inyectado por authRequired: { id_usuario, rol_name, ... }
const mascotaService = require('../services/mascotaService');

// ──────────────────────────────────────────────
// GET /api/mascotas/mias
// Rol: CLIENTE
// ──────────────────────────────────────────────
exports.getMisMascotas = async (req, res, next) => {
  try {
    const mascotas = await mascotaService.getMascotasByUsuario(req.user.id_usuario);
    return res.status(200).json({ mascotas });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// POST /api/mascotas
// Rol: CLIENTE
// Body: { nombre, especie, raza, tamano, fecha_nacimiento, temperamento, notas, foto_url }
// ──────────────────────────────────────────────
exports.createMascota = async (req, res, next) => {
  try {
    const mascota = await mascotaService.createMascotaForUsuario(req.user.id_usuario, req.body || {});
    return res.status(201).json({ message: 'Mascota registrada', mascota });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// PUT /api/mascotas/:id
// Rol: CLIENTE
// ──────────────────────────────────────────────
exports.updateMascota = async (req, res, next) => {
  try {
    const mascota = await mascotaService.updateMascotaForUsuario(
      req.user.id_usuario,
      req.params.id,
      req.body || {}
    );
    return res.status(200).json({ message: 'Mascota actualizada', mascota });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/mascotas/:id
// Rol: CLIENTE
// Devuelve 409 si la mascota tiene citas activas.
// ──────────────────────────────────────────────
exports.deleteMascota = async (req, res, next) => {
  try {
    await mascotaService.deleteMascotaForUsuario(req.user.id_usuario, req.params.id);
    return res.status(200).json({ message: 'Mascota eliminada correctamente' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
};
