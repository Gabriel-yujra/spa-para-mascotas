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
// GET /api/mascotas/:id
// Rol: STAFF (ADMIN, RECEPCION, JEFE, GROOMER, EMPLEADO)
// ──────────────────────────────────────────────
exports.getMascotaByIdForStaff = async (req, res, next) => {
  try {
    const mascota = await mascotaService.getMascotaById(req.params.id);
    return res.status(200).json({ mascota });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// POST /api/mascotas/:id/foto
// Roles: CLIENTE (solo sus mascotas), RECEPCION, ADMIN, JEFE
// Multipart field: foto (image/*)
// ──────────────────────────────────────────────
exports.uploadFoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo de imagen' });
    }
    const fotoUrl = `/uploads/mascotas/${req.file.filename}`;
    const mascota = await mascotaService.uploadFotoMascota(
      req.user.id_usuario,
      req.user.rol_name,
      req.params.id,
      fotoUrl
    );
    return res.status(200).json({ mascota });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
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

// ──────────────────────────────────────────────
// GET /api/mascotas/vacunas/catalogo
// Rol: CLIENTE + STAFF
// ──────────────────────────────────────────────
exports.getVacunasCatalogo = async (req, res, next) => {
  try {
    const vacunas = await mascotaService.getVacunasCatalogo();
    return res.status(200).json({ vacunas });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// GET /api/mascotas/:idMascota/vacunas
// Rol: CLIENTE (propias) + STAFF
// ──────────────────────────────────────────────
exports.getVacunasMascota = async (req, res, next) => {
  try {
    const vacunas = await mascotaService.getVacunasByMascota(
      req.user.id_usuario,
      req.user.rol_name,
      req.params.idMascota
    );
    return res.status(200).json({ vacunas });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ──────────────────────────────────────────────
// POST /api/mascotas/:idMascota/vacunas
// Rol: CLIENTE (propias) + STAFF
// Body: { id_vacuna, fecha_aplicacion, fecha_proxima?, observaciones? }
// ──────────────────────────────────────────────
exports.createVacunaMascota = async (req, res, next) => {
  try {
    const vacuna = await mascotaService.createVacunaForMascota(
      req.user.id_usuario,
      req.user.rol_name,
      req.params.idMascota,
      req.body || {}
    );
    return res.status(201).json({ message: 'Vacuna registrada', vacuna });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/mascotas/:idMascota/vacunas/:idMascotaVacuna
// Rol: CLIENTE (propias) + STAFF
// ──────────────────────────────────────────────
exports.deleteVacunaMascota = async (req, res, next) => {
  try {
    await mascotaService.deleteVacunaForMascota(
      req.user.id_usuario,
      req.user.rol_name,
      req.params.idMascota,
      req.params.idMascotaVacuna
    );
    return res.status(200).json({ message: 'Vacuna eliminada' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};
