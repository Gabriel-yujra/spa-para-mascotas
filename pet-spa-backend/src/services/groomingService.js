// src/services/groomingService.js
// Business logic for the grooming module.
// All database-mutating operations use transactions when touching more than one table.
const db = require('../config/db');

const trabajadorModel      = require('../models/trabajadorModel');
const citaModel            = require('../models/citaModel');
const groomingFichaModel   = require('../models/groomingFichaModel');
const groomingChecklistModel = require('../models/groomingChecklistModel');
const mascotaModel         = require('../models/mascotaModel');
const { ESTADOS, canTransition } = require('../utils/citaEstados');

class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function resolverTrabajador(idUsuario) {
  const trabajador = await trabajadorModel.findTrabajadorByUsuario(idUsuario);
  if (!trabajador) {
    throw new ServiceError(404, 'No se encontró un perfil de trabajador activo para este usuario');
  }
  return trabajador;
}

async function assertCitaDelGroomer(idCita, idTrabajador) {
  const { rows } = await db.query(
    `SELECT ct.id_cita_trabajador
       FROM cita_trabajadores ct
       JOIN citas c ON c.id_cita = ct.id_cita
      WHERE ct.id_cita = $1
        AND ct.id_trabajador = $2
      LIMIT 1`,
    [idCita, idTrabajador]
  );
  if (rows.length === 0) {
    const { rows: exists } = await db.query(
      `SELECT id_cita FROM citas WHERE id_cita = $1 LIMIT 1`,
      [idCita]
    );
    if (exists.length === 0) throw new ServiceError(404, 'Cita no encontrada');
    throw new ServiceError(403, 'Esta cita no está asignada a tu usuario');
  }
}

/**
 * Merges allItems with existing checklist rows so the caller always gets
 * one entry per item (realizado defaults to false when not yet saved).
 */
function mergeChecklist(allItems, savedRows) {
  return allItems.map((item) => {
    const saved = savedRows.find((r) => r.id_item === item.id_item);
    return {
      id_item:     item.id_item,
      nombre:      item.nombre,
      realizado:   saved?.realizado  ?? false,
      observacion: saved?.observacion ?? null,
    };
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * GET /api/grooming/agenda
 * Without fecha → all non-cancelled citas for this groomer (paginated).
 * With fecha    → only that day.
 */
async function getAgendaDelGroomer(idUsuario, { fecha, limit = 10, offset = 0 } = {}) {
  const trabajador = await resolverTrabajador(idUsuario);

  const citas = await citaModel.listCitasByTrabajador(
    trabajador.id_trabajador,
    { fecha, limit, offset }
  );

  const agenda = await Promise.all(
    citas.map(async (cita) => {
      const ficha = await groomingFichaModel.getFichaByCitaId(cita.id_cita);
      return {
        id_cita:               cita.id_cita,
        fecha_cita:            cita.fecha_cita,
        hora_inicio:           cita.fecha_inicio,
        mascota_nombre:        cita.mascota_nombre,
        mascota_tamano:        cita.mascota_tamano,
        mascota_alergias:      cita.mascota_alergias,
        mascota_restricciones: cita.mascota_restricciones,
        mascota_temperamento:  cita.mascota_temperamento,
        mascota_notas:         cita.mascota_notas,
        cliente_nombre:        cita.cliente_nombre,
        servicio_nombre:       cita.servicio_nombre,
        duracion_estimada_min: cita.duracion_estimada_min,
        estado_global:         cita.estado_global,
        tiene_ficha:           ficha !== null,
      };
    })
  );

  return agenda;
}

/**
 * GET /api/grooming/fichas/:idCita  (GROOMER)
 * Returns ficha (creating it if absent), full checklist, fotos, and cita state.
 */
async function getOrCreateFichaForCita(idUsuario, idCita) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  const [cita, existing] = await Promise.all([
    citaModel.findCitaById(idCita),
    groomingFichaModel.getFichaByCitaId(idCita),
  ]);

  const mascota = cita?.id_mascota
    ? await mascotaModel.findMascotaById(cita.id_mascota)
    : null;

  const ficha = existing || await groomingFichaModel.createFichaForCita(idCita, {});

  const [savedChecklist, allItems, fotos] = await Promise.all([
    groomingChecklistModel.getChecklistByFichaId(ficha.id_ficha),
    groomingChecklistModel.getAllItems(),
    groomingFichaModel.getFotosByFichaId(ficha.id_ficha),
  ]);

  return {
    ficha,
    mascota,
    checklist: mergeChecklist(allItems, savedChecklist),
    fotos,
    cita: cita ? {
      id_cita:       cita.id_cita,
      estado_global: cita.estado_global,
      fecha_cita:    cita.fecha_cita,
      servicio_nombre: cita.servicio_nombre,
    } : null,
  };
}

/**
 * PUT /api/grooming/fichas/:idCita  (GROOMER)
 * Updates ficha fields + optional checklist + optional state transition.
 *
 * Body fields:
 *   Ficha: estado_ingreso, observaciones, recomendaciones, tamano_mascota,
 *          temperatura, notas_internas, fecha_cierre, consumido_inventario
 *   Checklist: checklist ([{ id_item, realizado, observacion }])
 *   Cita state: nuevo_estado_global (optional)
 */
async function updateFichaFromGroomer(idUsuario, idCita, data) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  const {
    nuevo_estado_global,
    checklist,
    estado_ingreso,
    observaciones,
    recomendaciones,
    tamano_mascota,
    temperatura,
    notas_internas,
    fecha_cierre,
    consumido_inventario,
  } = data || {};

  const fichaFields = {
    ...(estado_ingreso       !== undefined && { estado_ingreso }),
    ...(observaciones        !== undefined && { observaciones }),
    ...(recomendaciones      !== undefined && { recomendaciones }),
    ...(tamano_mascota       !== undefined && { tamano_mascota }),
    ...(temperatura          !== undefined && { temperatura }),
    ...(notas_internas       !== undefined && { notas_internas }),
    ...(fecha_cierre         !== undefined && { fecha_cierre }),
    ...(consumido_inventario !== undefined && { consumido_inventario }),
  };

  const needsStateTransition = nuevo_estado_global !== undefined;
  const hasChecklist = Array.isArray(checklist) && checklist.length > 0;

  if (!needsStateTransition) {
    // No state change → simple update, no transaction required
    let ficha = await groomingFichaModel.getFichaByCitaId(idCita);
    if (!ficha) {
      ficha = await groomingFichaModel.createFichaForCita(idCita, fichaFields);
    } else if (Object.keys(fichaFields).length > 0) {
      ficha = await groomingFichaModel.updateFicha(ficha.id_ficha, fichaFields);
    }
    if (hasChecklist && ficha) {
      await groomingChecklistModel.upsertChecklistItems(ficha.id_ficha, checklist);
    }
    return { ficha };
  }

  // State change requested → validate, then run in a transaction
  const cita = await citaModel.findCitaById(idCita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, nuevo_estado_global)) {
    throw new ServiceError(
      409,
      `No se puede pasar de '${cita.estado_global}' a '${nuevo_estado_global}'`
    );
  }

  if (nuevo_estado_global === ESTADOS.COMPLETADA && !fichaFields.fecha_cierre) {
    fichaFields.fecha_cierre = new Date().toISOString();
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const citaActualizada = await citaModel.updateCitaCampos(
      idCita,
      { estado_global: nuevo_estado_global, terminado_por_empleado: trabajador.id_usuario },
      client
    );

    let ficha = await groomingFichaModel.getFichaByCitaId(idCita);
    if (!ficha) {
      ficha = await groomingFichaModel.createFichaForCita(idCita, fichaFields, client);
    } else if (Object.keys(fichaFields).length > 0) {
      ficha = await groomingFichaModel.updateFicha(ficha.id_ficha, fichaFields, client);
    }

    if (hasChecklist && ficha) {
      await groomingChecklistModel.upsertChecklistItems(ficha.id_ficha, checklist, client);
    }

    await client.query('COMMIT');
    return { ficha, cita: citaActualizada };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * GET /api/grooming/fichas/:idCita/admin  (RECEPCION / ADMIN / JEFE)
 * Full read-only view of the ficha. No ownership check — any staff can view.
 */
async function getFichaForAdmin(idCita) {
  const cita = await citaModel.findCitaById(idCita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  const mascota = cita.id_mascota
    ? await mascotaModel.findMascotaById(cita.id_mascota)
    : null;

  const ficha = await groomingFichaModel.getFichaByCitaId(idCita);

  if (!ficha) {
    return {
      ficha: null,
      mascota,
      checklist: [],
      fotos: [],
      cita: {
        id_cita:         cita.id_cita,
        estado_global:   cita.estado_global,
        fecha_cita:      cita.fecha_cita,
        servicio_nombre: cita.servicio_nombre,
      },
    };
  }

  const [savedChecklist, allItems, fotos] = await Promise.all([
    groomingChecklistModel.getChecklistByFichaId(ficha.id_ficha),
    groomingChecklistModel.getAllItems(),
    groomingFichaModel.getFotosByFichaId(ficha.id_ficha),
  ]);

  return {
    ficha,
    mascota,
    checklist: mergeChecklist(allItems, savedChecklist),
    fotos,
    cita: {
      id_cita:         cita.id_cita,
      estado_global:   cita.estado_global,
      fecha_cita:      cita.fecha_cita,
      servicio_nombre: cita.servicio_nombre,
    },
  };
}

/**
 * GET /api/grooming/mis-citas/:idCita/ficha  (CLIENTE)
 * Summary view — validates cita ownership, strips internal fields.
 */
async function getFichaForCliente(idUsuario, idCita) {
  const cita = await citaModel.findCitaById(idCita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  // Validate the cita belongs to the authenticated client
  if (cita.id_usuario_cliente !== idUsuario) {
    throw new ServiceError(403, 'Esta cita no pertenece a tu cuenta');
  }

  // Client can only see ficha for completed citas
  if (cita.estado_global !== ESTADOS.COMPLETADA) {
    throw new ServiceError(403, 'La ficha solo está disponible una vez completada la cita');
  }

  const mascota = cita.id_mascota
    ? await mascotaModel.findMascotaById(cita.id_mascota)
    : null;

  const ficha = await groomingFichaModel.getFichaByCitaId(idCita);

  if (!ficha) {
    return {
      mascota,
      servicio_nombre: cita.servicio_nombre,
      fecha_cita:      cita.fecha_cita,
      resumen:         null,
      checklist:       [],
      fotos:           [],
    };
  }

  const [savedChecklist, allItems, fotos] = await Promise.all([
    groomingChecklistModel.getChecklistByFichaId(ficha.id_ficha),
    groomingChecklistModel.getAllItems(),
    groomingFichaModel.getFotosByFichaId(ficha.id_ficha),
  ]);

  // Strip internal fields: notas_internas, temperatura, estado_ingreso
  return {
    mascota,
    servicio_nombre: cita.servicio_nombre,
    fecha_cita:      cita.fecha_cita,
    resumen: {
      recomendaciones: ficha.recomendaciones,
      fecha_cierre:    ficha.fecha_cierre,
    },
    checklist: mergeChecklist(allItems, savedChecklist),
    fotos,
  };
}

module.exports = {
  getAgendaDelGroomer,
  getOrCreateFichaForCita,
  updateFichaFromGroomer,
  getFichaForAdmin,
  getFichaForCliente,
};
