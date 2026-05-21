// src/services/groomingService.js
// Business logic for the grooming module.
// All database-mutating operations use transactions when touching more than one table.
const db = require('../config/db');

const trabajadorModel = require('../models/trabajadorModel');
const citaModel = require('../models/citaModel');
const groomingFichaModel = require('../models/groomingFichaModel');
const { ESTADOS, canTransition, TIPO_MOVIMIENTO } = require('../utils/citaEstados');

class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Resolve id_usuario → trabajador row.
 * Throws 404 if no active trabajador record exists for this user.
 */
async function resolverTrabajador(idUsuario) {
  const trabajador = await trabajadorModel.findTrabajadorByUsuario(idUsuario);
  if (!trabajador) {
    throw new ServiceError(404, 'No se encontró un perfil de trabajador activo para este usuario');
  }
  return trabajador;
}

/**
 * Verify that the cita is assigned to the given groomer.
 * Throws 403 if not assigned, 404 if the cita does not exist at all.
 */
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
    // Distinguish between "cita not found" and "not your cita"
    const { rows: exists } = await db.query(
      `SELECT id_cita FROM citas WHERE id_cita = $1 LIMIT 1`,
      [idCita]
    );
    if (exists.length === 0) throw new ServiceError(404, 'Cita no encontrada');
    throw new ServiceError(403, 'Esta cita no está asignada a tu usuario');
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * GET /api/grooming/agenda?fecha=YYYY-MM-DD
 *
 * Returns all non-cancelled citas assigned to the groomer for the given date.
 * Each item includes: id_cita, mascota_nombre, cliente_nombre, servicio_nombre,
 * fecha_inicio (slot), estado_global, and whether a ficha already exists.
 */
async function getAgendaDelGroomer(idUsuario, fecha) {
  const trabajador = await resolverTrabajador(idUsuario);

  const citas = await citaModel.listCitasByTrabajador(
    trabajador.id_trabajador,
    { fecha }
  );

  // Annotate each cita with whether a ficha exists (useful for UI badge)
  const agenda = await Promise.all(
    citas.map(async (cita) => {
      const ficha = await groomingFichaModel.getFichaByCitaId(cita.id_cita);
      return {
        id_cita: cita.id_cita,
        fecha_cita: cita.fecha_cita,
        hora_inicio: cita.fecha_inicio,
        mascota_nombre: cita.mascota_nombre,
        mascota_tamano: cita.mascota_tamano,
        cliente_nombre: cita.cliente_nombre,
        servicio_nombre: cita.servicio_nombre,
        duracion_estimada_min: cita.duracion_estimada_min,
        estado_global: cita.estado_global,
        tiene_ficha: ficha !== null,
      };
    })
  );

  return agenda;
}

/**
 * GET /api/grooming/fichas/:idCita
 *
 * Returns the ficha for the cita, creating it with default values if it doesn't exist yet.
 * Validates that the cita belongs to the requesting groomer.
 */
async function getOrCreateFichaForCita(idUsuario, idCita) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  const existing = await groomingFichaModel.getFichaByCitaId(idCita);
  if (existing) return existing;

  // Create with all-null defaults — no transaction needed (single table write)
  const ficha = await groomingFichaModel.createFichaForCita(idCita, {});
  return ficha;
}

/**
 * PUT /api/grooming/fichas/:idCita
 *
 * Updates ficha fields. Optionally transitions estado_global on the cita
 * (e.g. confirmada → en_progreso, en_progreso → completada) within the same
 * DB transaction.
 *
 * Accepted body fields:
 *   Ficha: estado_ingreso, observaciones, tamano_mascota, temperatura,
 *          notas_internas, fecha_cierre, consumido_inventario
 *   Cita state: nuevo_estado_global  (optional)
 */
async function updateFichaFromGroomer(idUsuario, idCita, data) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  const {
    nuevo_estado_global,
    estado_ingreso,
    observaciones,
    tamano_mascota,
    temperatura,
    notas_internas,
    fecha_cierre,
    consumido_inventario,
  } = data || {};

  const fichaFields = {
    ...(estado_ingreso        !== undefined && { estado_ingreso }),
    ...(observaciones         !== undefined && { observaciones }),
    ...(tamano_mascota        !== undefined && { tamano_mascota }),
    ...(temperatura           !== undefined && { temperatura }),
    ...(notas_internas        !== undefined && { notas_internas }),
    ...(fecha_cierre          !== undefined && { fecha_cierre }),
    ...(consumido_inventario  !== undefined && { consumido_inventario }),
  };

  const needsStateTransition = nuevo_estado_global !== undefined;

  if (!needsStateTransition) {
    // No state change → simple ficha update, no transaction required
    let ficha = await groomingFichaModel.getFichaByCitaId(idCita);
    if (!ficha) {
      ficha = await groomingFichaModel.createFichaForCita(idCita, fichaFields);
    } else if (Object.keys(fichaFields).length > 0) {
      ficha = await groomingFichaModel.updateFicha(ficha.id_ficha, fichaFields);
    }
    return { ficha };
  }

  // State change requested → validate transition, then run in a transaction
  const cita = await citaModel.findCitaById(idCita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, nuevo_estado_global)) {
    throw new ServiceError(
      409,
      `No se puede pasar de '${cita.estado_global}' a '${nuevo_estado_global}'`
    );
  }

  // Auto-set fecha_cierre when completing
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

    await client.query('COMMIT');
    return { ficha, cita: citaActualizada };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAgendaDelGroomer,
  getOrCreateFichaForCita,
  updateFichaFromGroomer,
};
