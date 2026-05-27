// src/controllers/groomingController.js
// HTTP layer only. Delegates all logic to groomingService.
// req.user is injected by authRequired: { id_usuario, rol_name, ... }
const groomingService = require('../services/groomingService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/grooming/agenda?fecha=YYYY-MM-DD&limit=10&page=1
// Role: GROOMER
// ─────────────────────────────────────────────────────────────────────────────
exports.getAgendaDelDia = async (req, res, next) => {
  try {
    const fecha  = req.query.fecha || undefined;
    const limit  = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const offset = (page - 1) * limit;

    const agenda = await groomingService.getAgendaDelGroomer(
      req.user.id_usuario,
      { fecha, limit, offset }
    );

    const response = { agenda, page, limit };
    if (fecha) response.fecha = fecha;
    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/grooming/fichas/:idCita
// Role: GROOMER — full editable view
// ─────────────────────────────────────────────────────────────────────────────
exports.getFicha = async (req, res, next) => {
  try {
    const result = await groomingService.getOrCreateFichaForCita(
      req.user.id_usuario,
      req.params.idCita
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/grooming/fichas/:idCita
// Role: GROOMER
// Body: { estado_ingreso, observaciones, recomendaciones, tamano_mascota,
//         temperatura, notas_internas, fecha_cierre, consumido_inventario,
//         checklist: [{ id_item, realizado, observacion }],
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/grooming/fichas/:idCita/admin
// Role: RECEPCION / ADMIN / JEFE — full read-only view (any cita)
// ─────────────────────────────────────────────────────────────────────────────
exports.getFichaAdmin = async (req, res, next) => {
  try {
    const result = await groomingService.getFichaForAdmin(req.params.idCita);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/grooming/mis-citas/:idCita/ficha
// Role: CLIENTE — friendly summary, only for own completed citas
// ─────────────────────────────────────────────────────────────────────────────
exports.getFichaCliente = async (req, res, next) => {
  try {
    const result = await groomingService.getFichaForCliente(
      req.user.id_usuario,
      req.params.idCita
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/grooming/fichas/:idCita/insumos
// Role: GROOMER — returns insumos list for own cita
// ─────────────────────────────────────────────────────────────────────────────
exports.getInsumos = async (req, res, next) => {
  try {
    const result = await groomingService.getInsumosForCita(
      req.user.id_usuario,
      req.params.idCita
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/grooming/fichas/:idCita/fotos
// Role: GROOMER — upload llegada/salida photo for own cita
// Multipart: field "foto" (image file), field "tipo" ('llegada' | 'salida')
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadFoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo (campo "foto")' });
    }
    const tipo = req.body?.tipo;
    if (!tipo) {
      return res.status(400).json({ error: 'Falta el campo "tipo" (llegada | salida)' });
    }
    const result = await groomingService.uploadFotoForCita(
      req.user.id_usuario,
      req.params.idCita,
      tipo,
      req.file.path
    );
    return res.status(201).json({ message: 'Foto subida', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/grooming/fichas/:idCita/insumos
// Role: GROOMER — replace insumos list for own cita
// Body: { items: [{ id_producto, unidades_usadas }] }
// ─────────────────────────────────────────────────────────────────────────────
exports.saveInsumos = async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items debe ser un array' });
    }
    const motivo = req.body?.motivo_consumo_elevado || null;
    const result = await groomingService.saveInsumosForCita(
      req.user.id_usuario,
      req.params.idCita,
      items,
      motivo
    );
    return res.status(200).json({ message: 'Insumos guardados', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};
