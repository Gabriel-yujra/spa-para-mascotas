// src/controllers/groomingController.js
// HTTP layer only. Delegates all logic to groomingService.
// req.user is injected by authRequired: { id_usuario, rol_name, ... }
const groomingService = require('../services/groomingService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/grooming/agenda?fecha=YYYY-MM-DD
// Role: GROOMER
// ─────────────────────────────────────────────────────────────────────────────
exports.getAgendaDelDia = async (req, res, next) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    const agenda = await groomingService.getAgendaDelGroomer(req.user.id_usuario, fecha);
    return res.status(200).json({ fecha, agenda });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/grooming/fichas/:idCita
// Role: GROOMER
// ─────────────────────────────────────────────────────────────────────────────
exports.getFicha = async (req, res, next) => {
  try {
    const ficha = await groomingService.getOrCreateFichaForCita(
      req.user.id_usuario,
      req.params.idCita
    );
    return res.status(200).json({ ficha });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/grooming/fichas/:idCita
// Role: GROOMER
// Body: { estado_ingreso, observaciones, tamano_mascota, temperatura,
//         notas_internas, fecha_cierre, consumido_inventario,
//         nuevo_estado_global }
// ─────────────────────────────────────────────────────────────────────────────
exports.updateFicha = async (req, res, next) => {
  try {
    const result = await groomingService.updateFichaFromGroomer(
      req.user.id_usuario,
      req.params.idCita,
      req.body || {}
    );
    return res.status(200).json({ message: 'Ficha actualizada', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};
