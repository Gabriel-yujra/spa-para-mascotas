// src/controllers/citaController.js
// Solo se ocupa de:
//   - extraer datos del request
//   - validar inputs básicos
//   - llamar al service / model correspondiente
//   - formatear la respuesta HTTP

const citaService = require('../services/citaService');
const citaModel = require('../models/citaModel');
const ctModel = require('../models/citaTrabajadorWriteModel');
const movModel = require('../models/citaMovimientoModel');
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

function isValidHHMM(s) {
  return typeof s === 'string' && /^\d{1,2}:\d{2}$/.test(s);
}

/**
 * Centraliza el manejo de errores del service: si ya viene con un .status,
 * lo respetamos; si no, 500.
 */
function handleError(res, err, defaultMsg = 'Error') {
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(`[${defaultMsg}]`, err);
  return res.status(500).json({ error: defaultMsg, message: err.message });
}

// ============================================================
// POST /api/citas    (cliente)
// ============================================================
exports.crearCita = async (req, res) => {
  const {
    id_mascota,
    id_servicio,
    fecha_cita,
    hora_inicio,
    id_trabajador_preferido,
  } = req.body || {};

  if (!isUuid(id_mascota))    return res.status(400).json({ error: 'id_mascota inválido' });
  if (!isUuid(id_servicio))   return res.status(400).json({ error: 'id_servicio inválido' });
  if (!isValidYMD(fecha_cita)) return res.status(400).json({ error: 'fecha_cita inválida (YYYY-MM-DD)' });
  if (!isValidHHMM(hora_inicio)) return res.status(400).json({ error: 'hora_inicio inválida (HH:MM)' });
  if (id_trabajador_preferido && !isUuid(id_trabajador_preferido)) {
    return res.status(400).json({ error: 'id_trabajador_preferido inválido' });
  }

  const meta = getRequestMeta(req);

  try {
    const out = await citaService.crearCita({
      id_usuario_cliente: req.user.id_usuario,
      id_mascota,
      id_servicio,
      fecha_cita,
      hora_inicio,
      id_trabajador_preferido: id_trabajador_preferido || null,
      meta,
    });

    return res.status(201).json({
      message: 'Cita creada correctamente. Pendiente de confirmación por recepción.',
      cita: out.cita,
      groomer_asignado: out.groomer,
      horario: {
        hora_inicio,
        hora_fin: out.hora_fin,
        duracion_min: out.duracion_min,
      },
    });
  } catch (err) {
    return handleError(res, err, 'Error al crear cita');
  }
};

// ============================================================
// GET /api/citas/mis-citas    (cliente)
// ============================================================
exports.misCitas = async (req, res) => {
  try {
    const soloFuturas = req.query.futuras === 'true';
    const citas = await citaModel.listCitasByUsuarioCliente(req.user.id_usuario, { soloFuturas });
    return res.status(200).json({ count: citas.length, citas });
  } catch (err) {
    return handleError(res, err, 'Error al listar citas');
  }
};

// ============================================================
// GET /api/citas/:id      (cualquier rol con acceso)
// El servicio NO está aquí: leemos directo del model + permisos.
// ============================================================
exports.detalleCita = async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const cita = await citaModel.findCitaById(id);
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

    // Reglas de acceso:
    //   - admin/jefe/recepcion: todo
    //   - cliente: solo si es la suya
    //   - groomer: solo si está asignado
    const rol = req.user.rol_name;
    if (rol === 'cliente') {
      if (cita.id_usuario_cliente !== req.user.id_usuario) {
        return res.status(403).json({ error: 'No tienes acceso a esta cita' });
      }
    } else if (rol === 'trabajador' || rol === 'groomer') {
      const id_trabajador = await ctModel.findIdTrabajadorByUsuario(req.user.id_usuario);
      if (!id_trabajador) return res.status(403).json({ error: 'No autorizado' });
      const asignado = await ctModel.estaAsignadoACita(id, id_trabajador);
      if (!asignado) return res.status(403).json({ error: 'No estás asignado a esta cita' });
    }

    const [groomers, movimientos] = await Promise.all([
      ctModel.listGroomersDeCita(id),
      movModel.listMovimientosDeCita(id),
    ]);

    return res.status(200).json({ cita, groomers, movimientos });
  } catch (err) {
    return handleError(res, err, 'Error al obtener cita');
  }
};

// ============================================================
// PATCH /api/citas/:id/cancelar-cliente    (cliente)
// ============================================================
exports.cancelarComoCliente = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body || {};
  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const cita = await citaService.cancelarCita({
      id_cita: id,
      id_usuario_origen: req.user.id_usuario,
      motivo: motivo || null,
      porRecepcion: false,
      meta: getRequestMeta(req),
    });
    return res.status(200).json({ message: 'Cita cancelada', cita });
  } catch (err) {
    return handleError(res, err, 'Error al cancelar cita');
  }
};

// ============================================================
// GET /api/citas/recepcion    (recepción/admin/jefe)
// Query: fecha, estado, groomerId
// ============================================================
exports.listarBandeja = async (req, res) => {
  const { fecha, estado, groomerId } = req.query;
  if (fecha && !isValidYMD(fecha)) return res.status(400).json({ error: 'fecha inválida (YYYY-MM-DD)' });
  if (groomerId && !isUuid(groomerId)) return res.status(400).json({ error: 'groomerId inválido' });

  try {
    const citas = await citaModel.listCitasRecepcion({
      fecha:        fecha || null,
      estado:       estado || null,
      id_trabajador: groomerId || null,
    });
    return res.status(200).json({ count: citas.length, citas });
  } catch (err) {
    return handleError(res, err, 'Error al listar bandeja');
  }
};

// ============================================================
// GET /api/citas/pendientes    (recepción/admin/jefe)
// ============================================================
exports.listarPendientes = async (req, res) => {
  const { from, to, id_servicio } = req.query;
  if (from && !isValidYMD(from)) return res.status(400).json({ error: 'from inválido' });
  if (to   && !isValidYMD(to))   return res.status(400).json({ error: 'to inválido' });
  if (id_servicio && !isUuid(id_servicio)) return res.status(400).json({ error: 'id_servicio inválido' });

  try {
    const citas = await citaModel.listCitasPendientes({
      from: from || null,
      to: to || null,
      id_servicio: id_servicio || null,
    });
    return res.status(200).json({ count: citas.length, citas });
  } catch (err) {
    return handleError(res, err, 'Error al listar pendientes');
  }
};

// ============================================================
// PATCH /api/citas/:id/confirmar    (recepción/admin/jefe)
// ============================================================
exports.confirmar = async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const cita = await citaService.confirmarCita({
      id_cita: id,
      id_usuario_recepcion: req.user.id_usuario,
      meta: getRequestMeta(req),
    });
    return res.status(200).json({ message: 'Cita confirmada', cita });
  } catch (err) {
    return handleError(res, err, 'Error al confirmar cita');
  }
};

// ============================================================
// PATCH /api/citas/:id/reprogramar    (recepción/admin/jefe)
// ============================================================
exports.reprogramar = async (req, res) => {
  const { id } = req.params;
  const { nueva_fecha, nueva_hora_inicio, nuevo_id_trabajador } = req.body || {};

  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });
  if (!isValidYMD(nueva_fecha))         return res.status(400).json({ error: 'nueva_fecha inválida' });
  if (!isValidHHMM(nueva_hora_inicio))  return res.status(400).json({ error: 'nueva_hora_inicio inválida' });
  if (nuevo_id_trabajador && !isUuid(nuevo_id_trabajador)) {
    return res.status(400).json({ error: 'nuevo_id_trabajador inválido' });
  }

  try {
    const cita = await citaService.reprogramarCita({
      id_cita: id,
      nueva_fecha,
      nueva_hora_inicio,
      nuevo_id_trabajador: nuevo_id_trabajador || null,
      id_usuario_recepcion: req.user.id_usuario,
      meta: getRequestMeta(req),
    });
    return res.status(200).json({ message: 'Cita reprogramada', cita });
  } catch (err) {
    return handleError(res, err, 'Error al reprogramar cita');
  }
};

// ============================================================
// PATCH /api/citas/:id/cancelar    (recepción/admin/jefe)
// ============================================================
exports.cancelarComoRecepcion = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body || {};
  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });
  if (!isNonEmptyString(motivo)) {
    return res.status(400).json({ error: 'motivo es obligatorio cuando cancela recepción' });
  }

  try {
    const cita = await citaService.cancelarCita({
      id_cita: id,
      id_usuario_origen: req.user.id_usuario,
      motivo,
      porRecepcion: true,
      meta: getRequestMeta(req),
    });
    return res.status(200).json({ message: 'Cita cancelada', cita });
  } catch (err) {
    return handleError(res, err, 'Error al cancelar cita');
  }
};

// ============================================================
// PATCH /api/citas/:id/no-asistio    (recepción/admin/jefe)
// ============================================================
exports.noAsistio = async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const cita = await citaService.marcarNoAsistio({
      id_cita: id,
      id_usuario_recepcion: req.user.id_usuario,
      meta: getRequestMeta(req),
    });
    return res.status(200).json({ message: "Cita marcada 'no_asistio'", cita });
  } catch (err) {
    return handleError(res, err, 'Error al marcar no_asistio');
  }
};

// ============================================================
// GET /api/citas/asignadas   (groomer)
// ============================================================
exports.misAsignadas = async (req, res) => {
  const { fecha } = req.query;
  if (fecha && !isValidYMD(fecha)) return res.status(400).json({ error: 'fecha inválida' });

  try {
    const id_trabajador = await ctModel.findIdTrabajadorByUsuario(req.user.id_usuario);
    if (!id_trabajador) return res.status(403).json({ error: 'El usuario no es un trabajador registrado' });

    const citas = await citaModel.listCitasByTrabajador(id_trabajador, { fecha: fecha || null });
    return res.status(200).json({ count: citas.length, citas });
  } catch (err) {
    return handleError(res, err, 'Error al listar citas asignadas');
  }
};

// ============================================================
// PATCH /api/citas/:id/en-progreso    (groomer)
// ============================================================
exports.enProgreso = async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const cita = await citaService.marcarEnProgreso({
      id_cita: id,
      id_usuario_groomer: req.user.id_usuario,
      meta: getRequestMeta(req),
    });
    return res.status(200).json({ message: 'Cita en progreso', cita });
  } catch (err) {
    return handleError(res, err, 'Error al marcar en_progreso');
  }
};

// ============================================================
// PATCH /api/citas/:id/completar    (groomer)
// ============================================================
exports.completar = async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const cita = await citaService.completarCita({
      id_cita: id,
      id_usuario_groomer: req.user.id_usuario,
      meta: getRequestMeta(req),
    });
    return res.status(200).json({ message: 'Cita completada', cita });
  } catch (err) {
    return handleError(res, err, 'Error al completar cita');
  }
};
