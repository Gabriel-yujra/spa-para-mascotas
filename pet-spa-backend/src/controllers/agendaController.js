// src/controllers/agendaController.js
// Controladores HTTP del módulo de agenda. Solo orquesta:
// validan inputs simples, llaman al service o a un model, formatean la respuesta.

const agendaService = require('../services/agendaService');
const bloqueoAgendaModel = require('../models/bloqueoAgendaModel');
const trabajadorModel = require('../models/trabajadorModel');
const auditLogModel = require('../models/auditLogModel');
const { isUuid, isNonEmptyString } = require('../utils/validationUtils');

function getRequestMeta(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const user_agent = req.headers['user-agent'] || null;
  return { ip, user_agent };
}

function isValidYMD(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ============================================================
// GET /api/agenda/disponibilidad
// Query: fecha, id_servicio, id_mascota, [id_trabajador]
// ============================================================
exports.getDisponibilidad = async (req, res) => {
  const { fecha, id_servicio, id_mascota, id_trabajador } = req.query;

  if (!isValidYMD(fecha))    return res.status(400).json({ error: 'fecha inválida (YYYY-MM-DD)' });
  if (!isUuid(id_servicio))  return res.status(400).json({ error: 'id_servicio inválido' });
  if (!isUuid(id_mascota))   return res.status(400).json({ error: 'id_mascota inválido' });
  if (id_trabajador && !isUuid(id_trabajador)) {
    return res.status(400).json({ error: 'id_trabajador inválido' });
  }

  try {
    const result = await agendaService.calcularDisponibilidad({
      fecha,
      id_servicio,
      id_mascota,
      id_trabajador: id_trabajador || null,
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('[getDisponibilidad]', err);
    return res.status(500).json({ error: 'Error al calcular disponibilidad', message: err.message });
  }
};

// ============================================================
// GET /api/agenda/groomers-disponibles
// Query: fecha, hora_inicio (HH:MM), id_servicio, id_mascota
// ============================================================
exports.getGroomersDisponibles = async (req, res) => {
  const { fecha, hora_inicio, id_servicio, id_mascota } = req.query;

  if (!isValidYMD(fecha))    return res.status(400).json({ error: 'fecha inválida (YYYY-MM-DD)' });
  if (!isNonEmptyString(hora_inicio) || !/^\d{1,2}:\d{2}$/.test(hora_inicio)) {
    return res.status(400).json({ error: 'hora_inicio inválida (HH:MM)' });
  }
  if (!isUuid(id_servicio))  return res.status(400).json({ error: 'id_servicio inválido' });
  if (!isUuid(id_mascota))   return res.status(400).json({ error: 'id_mascota inválido' });

  try {
    const result = await agendaService.groomersDisponiblesEnSlot({
      fecha, hora_inicio, id_servicio, id_mascota,
    });
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('[getGroomersDisponibles]', err);
    return res.status(500).json({ error: 'Error al calcular groomers', message: err.message });
  }
};

// ============================================================
// POST /api/agenda/bloqueos      (solo admin / recepcion / jefe)
// Body: { fecha, motivo, tipo, id_trabajador? }
// ============================================================
exports.createBloqueo = async (req, res) => {
  const { fecha, motivo, tipo, id_trabajador } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);

  if (!isValidYMD(fecha)) return res.status(400).json({ error: 'fecha inválida (YYYY-MM-DD)' });
  if (!isNonEmptyString(tipo)) return res.status(400).json({ error: 'tipo es obligatorio' });
  if (id_trabajador && !isUuid(id_trabajador)) {
    return res.status(400).json({ error: 'id_trabajador inválido' });
  }

  try {
    const bloqueo = await bloqueoAgendaModel.createBloqueo({
      fecha,
      motivo: motivo || null,
      tipo,
      id_trabajador: id_trabajador || null,
    });

    await auditLogModel.logAction({
      id_usuario: req.user.id_usuario,
      accion: 'crear_bloqueo_agenda',
      detalle: `Bloqueo ${tipo} para ${fecha}` +
        (id_trabajador ? ` trabajador=${id_trabajador}` : ' (global)') +
        ` por ${req.user.email}`,
      ip_address: ip,
      user_agent,
    });

    return res.status(201).json({ message: 'Bloqueo creado', bloqueo });
  } catch (err) {
    console.error('[createBloqueo]', err);
    return res.status(500).json({ error: 'Error al crear bloqueo', message: err.message });
  }
};

// ============================================================
// GET /api/agenda/bloqueos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// ============================================================
exports.listBloqueos = async (req, res) => {
  const { desde, hasta } = req.query;

  if (!isValidYMD(desde)) return res.status(400).json({ error: 'desde inválido (YYYY-MM-DD)' });
  if (!isValidYMD(hasta)) return res.status(400).json({ error: 'hasta inválido (YYYY-MM-DD)' });
  if (desde > hasta)      return res.status(400).json({ error: 'desde debe ser ≤ hasta' });

  try {
    const bloqueos = await bloqueoAgendaModel.listBloqueosEnRango(desde, hasta);
    return res.status(200).json({ desde, hasta, count: bloqueos.length, bloqueos });
  } catch (err) {
    console.error('[listBloqueos]', err);
    return res.status(500).json({ error: 'Error al listar bloqueos', message: err.message });
  }
};

// ============================================================
// GET /api/agenda/groomers      (staff: admin, jefe, recepcion)
// Lista todos los groomers activos para selección en formularios de bloqueos.
// ============================================================
exports.listGroomers = async (req, res) => {
  try {
    const groomers = await trabajadorModel.listGroomersActivos();
    return res.status(200).json({ groomers });
  } catch (err) {
    console.error('[listGroomers]', err);
    return res.status(500).json({ error: 'Error al listar groomers', message: err.message });
  }
};

// ============================================================
// DELETE /api/agenda/bloqueos/:id      (solo admin / recepcion / jefe)
// ============================================================
exports.deleteBloqueo = async (req, res) => {
  const { id } = req.params;
  const { ip, user_agent } = getRequestMeta(req);

  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const ok = await bloqueoAgendaModel.deleteBloqueo(id);
    if (!ok) return res.status(404).json({ error: 'Bloqueo no encontrado' });

    await auditLogModel.logAction({
      id_usuario: req.user.id_usuario,
      accion: 'eliminar_bloqueo_agenda',
      detalle: `Bloqueo ${id} eliminado por ${req.user.email}`,
      ip_address: ip,
      user_agent,
    });

    return res.status(200).json({ message: 'Bloqueo eliminado' });
  } catch (err) {
    console.error('[deleteBloqueo]', err);
    return res.status(500).json({ error: 'Error al eliminar bloqueo', message: err.message });
  }
};
