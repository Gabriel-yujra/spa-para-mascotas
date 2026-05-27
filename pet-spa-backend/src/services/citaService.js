// src/services/citaService.js
// Orquesta las operaciones de citas:
//  - valida transiciones de estado
//  - reutiliza agendaService para validar slots
//  - usa transacciones para mantener `citas` y `cita_trabajadores` consistentes
//  - delega el registro en cita_movimientos y audit_log a los models
const db = require('../config/db');

const citaModel = require('../models/citaModel');
const ctModel = require('../models/citaTrabajadorWriteModel');
const movModel = require('../models/citaMovimientoModel');
const auditLogModel = require('../models/auditLogModel');
const cajaModel = require('../models/cajaModel');
const opinionModel = require('../models/opinionModel');
const clienteModel = require('../models/clienteModel');

const agendaService = require('./agendaService');
const { calcularPrecioAjustado } = agendaService;
const mascotaModel  = require('../models/mascotaModel');
const servicioModel = require('../models/servicioModel');
const { buildDate, addMinutes } = require('../utils/timeUtils');
const {
  ESTADOS, ESTADOS_GROOMER_INMUTABLE,
  TIPO_MOVIMIENTO, canTransition, isTerminal,
} = require('../utils/citaEstados');

/**
 * Helper: error tipado para que los controllers respondan el status correcto.
 */
class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/**
 * Verifica que la mascota pertenezca al cliente (id_usuario_cliente del JWT).
 * Devuelve { id_cliente } si es válida; lanza si no.
 */
async function assertMascotaDelCliente(id_mascota, id_usuario_cliente) {
  const { rows } = await db.query(
    `SELECT m.id_mascota, m.id_cliente
       FROM mascotas m
       JOIN clientes c ON c.id_cliente = m.id_cliente
      WHERE m.id_mascota = $1 AND c.id_usuario = $2
      LIMIT 1`,
    [id_mascota, id_usuario_cliente]
  );
  if (rows.length === 0) {
    throw new ServiceError(403, 'La mascota no pertenece al cliente autenticado');
  }
  return { id_cliente: rows[0].id_cliente };
}

/**
 * Llama al servicio de agenda y valida que el slot pedido esté disponible.
 * Si el cliente especificó un groomer preferido, comprueba que esté en la lista.
 *
 * Devuelve la metadata calculada por agenda (duracion_min, hora_fin, groomers
 * disponibles, etc.) para reutilizarla al insertar `cita_trabajadores`.
 */
async function validarSlotDisponible({
  fecha, hora_inicio, id_servicio, id_mascota, id_trabajador_preferido = null,
}) {
  const disp = await agendaService.groomersDisponiblesEnSlot({
    fecha, hora_inicio, id_servicio, id_mascota,
  });

  if (disp.error) {
    throw new ServiceError(disp.error.status, disp.error.message);
  }
  if (disp.dia_laboral === false) {
    throw new ServiceError(400, 'La fecha solicitada no es laboral o tiene bloqueo global');
  }
  if (!disp.groomers_disponibles || disp.groomers_disponibles.length === 0) {
    throw new ServiceError(409, 'No hay groomers disponibles para ese slot');
  }

  let groomerElegido;
  if (id_trabajador_preferido) {
    groomerElegido = disp.groomers_disponibles.find(
      (g) => g.id_trabajador === id_trabajador_preferido
    );
    if (!groomerElegido) {
      throw new ServiceError(
        409,
        'El groomer preferido no está disponible en ese slot. Elige otro o deja al sistema asignar.'
      );
    }
  } else {
    // Heurística simple: el de menor ocupación primero (luego alfabético).
    const ordenados = [...disp.groomers_disponibles].sort((a, b) => {
      if (a.ocupadas !== b.ocupadas) return a.ocupadas - b.ocupadas;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
    groomerElegido = ordenados[0];
  }

  return {
    duracion_min: disp.duracion_min,
    hora_fin:    disp.hora_fin,
    estado_slot: disp.estado,
    groomerElegido,
  };
}

// ============================================================
// CREAR CITA (cliente)
// ============================================================
async function crearCita({
  id_usuario_cliente,
  id_mascota,
  id_servicio,
  fecha_cita,
  hora_inicio,
  id_trabajador_preferido = null,
  meta = {},
}) {
  // 1. Mascota del cliente
  const { id_cliente } = await assertMascotaDelCliente(id_mascota, id_usuario_cliente);

  // 2. Slot válido + groomer
  const slotInfo = await validarSlotDisponible({
    fecha: fecha_cita,
    hora_inicio,
    id_servicio,
    id_mascota,
    id_trabajador_preferido,
  });

  // 2b. Precio calculado según tamaño real de la mascota
  const [mascotaData, servicioData] = await Promise.all([
    mascotaModel.findMascotaParaAgenda(id_mascota),
    servicioModel.findServicioParaAgenda(id_servicio),
  ]);
  const precio_calculado = calcularPrecioAjustado(servicioData, mascotaData?.tamano);

  // 3. Transacción
  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');

    const cita = await citaModel.createCita(
      {
        id_cliente,
        id_mascota,
        id_servicio,
        fecha_cita,
        estado_empleado:  ESTADOS.PENDIENTE,
        estado_cliente:   ESTADOS.PENDIENTE,
        estado_global:    ESTADOS.PENDIENTE,
        precio_calculado,
      },
      dbClient
    );

    const fechaInicio = buildDate(fecha_cita, hora_inicio);
    const fechaFin    = addMinutes(fechaInicio, slotInfo.duracion_min);

    await ctModel.asignarGroomer(
      {
        id_cita: cita.id_cita,
        id_trabajador: slotInfo.groomerElegido.id_trabajador,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
      dbClient
    );

    await movModel.logMovimiento(
      {
        id_cita: cita.id_cita,
        tipo_movimiento: TIPO_MOVIMIENTO.CREACION,
        fecha_anterior: null,
        fecha_nueva: fecha_cita,
        id_usuario_origen: id_usuario_cliente,
        descripcion: `Cita creada por cliente. Groomer asignado: ${slotInfo.groomerElegido.nombre || slotInfo.groomerElegido.id_trabajador}.`,
      },
      dbClient
    );

    await auditLogModel.logAction(
      {
        id_usuario: id_usuario_cliente,
        accion: 'crear_cita',
        detalle: `Cita ${cita.id_cita} para ${fecha_cita} ${hora_inicio} (servicio=${id_servicio}, mascota=${id_mascota})`,
        ip_address: meta.ip || null,
        user_agent: meta.user_agent || null,
      },
      dbClient
    );

    await dbClient.query('COMMIT');

    return {
      cita,
      groomer: slotInfo.groomerElegido,
      hora_inicio,
      hora_fin: slotInfo.hora_fin,
      duracion_min: slotInfo.duracion_min,
    };
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

// ============================================================
// CONFIRMAR CITA (recepción/admin)
// ============================================================
async function confirmarCita({ id_cita, id_usuario_recepcion, meta = {} }) {
  const cita = await citaModel.findCitaById(id_cita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, ESTADOS.CONFIRMADA)) {
    throw new ServiceError(
      400,
      `No se puede confirmar una cita en estado '${cita.estado_global}'`
    );
  }

  // Re-validar slot: entre la creación y la confirmación pudo cambiar la
  // ocupación. La cita ya está en cita_trabajadores, así que la consulta
  // de disponibilidad la cuenta como "ocupada"; por eso lo validamos
  // contando solo si HAY ALGÚN groomer asignado y el rango no quedó vacío.
  const groomers = await ctModel.listGroomersDeCita(id_cita);
  if (groomers.length === 0) {
    throw new ServiceError(400, 'La cita no tiene groomer asignado. Asigna uno antes de confirmar.');
  }

  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');

    await citaModel.updateCitaCampos(
      id_cita,
      {
        estado_empleado: ESTADOS.CONFIRMADA,
        estado_global: ESTADOS.CONFIRMADA,
      },
      dbClient
    );

    await movModel.logMovimiento(
      {
        id_cita,
        tipo_movimiento: TIPO_MOVIMIENTO.CONFIRMACION,
        fecha_anterior: null,
        fecha_nueva: cita.fecha_cita,
        id_usuario_origen: id_usuario_recepcion,
        descripcion: 'Cita confirmada por recepción/admin',
      },
      dbClient
    );

    await auditLogModel.logAction(
      {
        id_usuario: id_usuario_recepcion,
        accion: 'confirmar_cita',
        detalle: `Cita ${id_cita} confirmada`,
        ip_address: meta.ip || null,
        user_agent: meta.user_agent || null,
      },
      dbClient
    );

    await dbClient.query('COMMIT');
    return await citaModel.findCitaById(id_cita);
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

// ============================================================
// REPROGRAMAR CITA (recepción/admin)
// ============================================================
async function reprogramarCita({
  id_cita, nueva_fecha, nueva_hora_inicio,
  nuevo_id_trabajador = null,
  id_usuario_recepcion, meta = {},
}) {
  const cita = await citaModel.findCitaById(id_cita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (isTerminal(cita.estado_global)) {
    throw new ServiceError(400, `No se puede reprogramar una cita en estado '${cita.estado_global}'`);
  }

  // Regla: si la cita ya está confirmada (o más adelante), NO se cambia el groomer.
  const groomersActuales = await ctModel.listGroomersDeCita(id_cita);
  const groomerActual = groomersActuales[0] || null;

  let idTrabajadorParaSlot;
  if (ESTADOS_GROOMER_INMUTABLE.has(cita.estado_global)) {
    if (nuevo_id_trabajador && groomerActual &&
        nuevo_id_trabajador !== groomerActual.id_trabajador) {
      throw new ServiceError(
        409,
        'No se puede cambiar el groomer de una cita ya confirmada. Solo es posible cambiar fecha/hora.'
      );
    }
    idTrabajadorParaSlot = groomerActual ? groomerActual.id_trabajador : null;
  } else {
    // Pendiente: se permite cambiar groomer si el caller lo pidió.
    idTrabajadorParaSlot = nuevo_id_trabajador || (groomerActual?.id_trabajador ?? null);
  }

  // Validar disponibilidad. NOTA: la propia cita aparece como "ocupada" en
  // el slot original; si la nueva fecha es la misma con groomer distinto eso
  // sigue siendo seguro porque pedimos un slot NUEVO.
  const slotInfo = await validarSlotDisponible({
    fecha: nueva_fecha,
    hora_inicio: nueva_hora_inicio,
    id_servicio: cita.id_servicio,
    id_mascota:  cita.id_mascota,
    id_trabajador_preferido: idTrabajadorParaSlot,
  });

  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');

    const fechaAnterior = cita.fecha_cita;
    await citaModel.updateFechaCita(id_cita, nueva_fecha, dbClient);

    const fechaInicio = buildDate(nueva_fecha, nueva_hora_inicio);
    const fechaFin    = addMinutes(fechaInicio, slotInfo.duracion_min);

    // Si el groomer cambia, reemplazamos asignaciones; si no, solo movemos
    // los timestamps de las existentes.
    const cambiaGroomer = (
      !ESTADOS_GROOMER_INMUTABLE.has(cita.estado_global) &&
      groomerActual &&
      slotInfo.groomerElegido.id_trabajador !== groomerActual.id_trabajador
    );

    if (cambiaGroomer || !groomerActual) {
      await ctModel.clearGroomersDeCita(id_cita, dbClient);
      await ctModel.asignarGroomer(
        {
          id_cita,
          id_trabajador: slotInfo.groomerElegido.id_trabajador,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
        dbClient
      );
    } else {
      await ctModel.actualizarHorarioDeAsignaciones(
        id_cita, fechaInicio, fechaFin, dbClient
      );
    }

    // Estado global: si estaba 'pendiente' o 'confirmada', pasa a 'reprogramada'
    // para reflejar que fue movida. La recepción puede después volver a 'confirmada'.
    let nuevoEstado;
    if (canTransition(cita.estado_global, ESTADOS.REPROGRAMADA)) {
      nuevoEstado = ESTADOS.REPROGRAMADA;
    } else {
      nuevoEstado = cita.estado_global; // sin cambio
    }

    await citaModel.updateCitaCampos(
      id_cita,
      { estado_global: nuevoEstado, estado_empleado: nuevoEstado },
      dbClient
    );

    await movModel.logMovimiento(
      {
        id_cita,
        tipo_movimiento: TIPO_MOVIMIENTO.REPROGRAMACION,
        fecha_anterior: fechaAnterior,
        fecha_nueva: nueva_fecha,
        id_usuario_origen: id_usuario_recepcion,
        descripcion: cambiaGroomer
          ? `Reprogramada a ${nueva_fecha} ${nueva_hora_inicio} con nuevo groomer ${slotInfo.groomerElegido.id_trabajador}`
          : `Reprogramada a ${nueva_fecha} ${nueva_hora_inicio}`,
      },
      dbClient
    );

    await auditLogModel.logAction(
      {
        id_usuario: id_usuario_recepcion,
        accion: 'reprogramar_cita',
        detalle: `Cita ${id_cita}: ${fechaAnterior} → ${nueva_fecha} ${nueva_hora_inicio}`,
        ip_address: meta.ip || null,
        user_agent: meta.user_agent || null,
      },
      dbClient
    );

    await dbClient.query('COMMIT');
    return await citaModel.findCitaById(id_cita);
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

// ============================================================
// CANCELAR — variante cliente y recepción
// ============================================================
async function cancelarCita({
  id_cita,
  id_usuario_origen,
  motivo = null,
  porRecepcion = false,
  meta = {},
}) {
  const cita = await citaModel.findCitaById(id_cita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, ESTADOS.CANCELADA)) {
    throw new ServiceError(
      400,
      `No se puede cancelar una cita en estado '${cita.estado_global}'`
    );
  }

  // Si la cancelación es del cliente, validamos que SEA su cita.
  if (!porRecepcion) {
    if (cita.id_usuario_cliente !== id_usuario_origen) {
      throw new ServiceError(403, 'No puedes cancelar una cita que no es tuya');
    }
  }

  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');

    await citaModel.updateCitaCampos(
      id_cita,
      {
        estado_cliente: porRecepcion ? cita.estado_cliente : ESTADOS.CANCELADA,
        estado_empleado: ESTADOS.CANCELADA,
        estado_global: ESTADOS.CANCELADA,
        motivo_cancelacion: motivo,
        cancelado_por: id_usuario_origen,
      },
      dbClient
    );

    const tipo = porRecepcion
      ? TIPO_MOVIMIENTO.CANCELACION_RECEPCION
      : TIPO_MOVIMIENTO.CANCELACION_CLIENTE;

    await movModel.logMovimiento(
      {
        id_cita,
        tipo_movimiento: tipo,
        fecha_anterior: null,
        fecha_nueva: cita.fecha_cita,
        id_usuario_origen,
        descripcion: motivo || 'Sin motivo especificado',
      },
      dbClient
    );

    await auditLogModel.logAction(
      {
        id_usuario: id_usuario_origen,
        accion: tipo,
        detalle: `Cita ${id_cita} cancelada. Motivo: ${motivo || '(sin motivo)'}`,
        ip_address: meta.ip || null,
        user_agent: meta.user_agent || null,
      },
      dbClient
    );

    await dbClient.query('COMMIT');
    return await citaModel.findCitaById(id_cita);
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

// ============================================================
// NO ASISTIO (recepción/admin)
// ============================================================
async function marcarNoAsistio({ id_cita, id_usuario_recepcion, meta = {} }) {
  const cita = await citaModel.findCitaById(id_cita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, ESTADOS.NO_ASISTIO)) {
    throw new ServiceError(
      400,
      `No se puede marcar 'no asistió' desde el estado '${cita.estado_global}'`
    );
  }

  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');

    await citaModel.updateCitaCampos(
      id_cita,
      {
        estado_empleado: ESTADOS.NO_ASISTIO,
        estado_global: ESTADOS.NO_ASISTIO,
      },
      dbClient
    );

    await movModel.logMovimiento(
      {
        id_cita,
        tipo_movimiento: TIPO_MOVIMIENTO.NO_ASISTIO,
        fecha_anterior: null,
        fecha_nueva: cita.fecha_cita,
        id_usuario_origen: id_usuario_recepcion,
        descripcion: 'Cliente no se presentó',
      },
      dbClient
    );

    await auditLogModel.logAction(
      {
        id_usuario: id_usuario_recepcion,
        accion: 'no_asistio_cita',
        detalle: `Cita ${id_cita} marcada como no_asistio`,
        ip_address: meta.ip || null,
        user_agent: meta.user_agent || null,
      },
      dbClient
    );

    await dbClient.query('COMMIT');
    return await citaModel.findCitaById(id_cita);
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

// ============================================================
// GROOMER: marcar en progreso / completar
// ============================================================
async function marcarEnProgreso({ id_cita, id_usuario_groomer, meta = {} }) {
  const id_trabajador = await ctModel.findIdTrabajadorByUsuario(id_usuario_groomer);
  if (!id_trabajador) throw new ServiceError(403, 'El usuario no es un trabajador registrado');

  const asignado = await ctModel.estaAsignadoACita(id_cita, id_trabajador);
  if (!asignado) throw new ServiceError(403, 'No estás asignado a esta cita');

  const cita = await citaModel.findCitaById(id_cita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, ESTADOS.EN_PROGRESO)) {
    throw new ServiceError(
      400,
      `No se puede marcar 'en_progreso' desde '${cita.estado_global}'`
    );
  }

  await citaModel.updateCitaCampos(id_cita, {
    estado_empleado: ESTADOS.EN_PROGRESO,
    estado_global: ESTADOS.EN_PROGRESO,
  });

  await movModel.logMovimiento({
    id_cita,
    tipo_movimiento: TIPO_MOVIMIENTO.EN_PROGRESO,
    fecha_anterior: null,
    fecha_nueva: cita.fecha_cita,
    id_usuario_origen: id_usuario_groomer,
    descripcion: 'Cita marcada en_progreso por el groomer',
  });

  await auditLogModel.logAction({
    id_usuario: id_usuario_groomer,
    accion: 'cita_en_progreso',
    detalle: `Cita ${id_cita} -> en_progreso`,
    ip_address: meta.ip || null,
    user_agent: meta.user_agent || null,
  });

  return await citaModel.findCitaById(id_cita);
}

async function completarCita({ id_cita, id_usuario_groomer, meta = {} }) {
  const id_trabajador = await ctModel.findIdTrabajadorByUsuario(id_usuario_groomer);
  if (!id_trabajador) throw new ServiceError(403, 'El usuario no es un trabajador registrado');

  const asignado = await ctModel.estaAsignadoACita(id_cita, id_trabajador);
  if (!asignado) throw new ServiceError(403, 'No estás asignado a esta cita');

  const cita = await citaModel.findCitaById(id_cita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, ESTADOS.COMPLETADA)) {
    throw new ServiceError(
      400,
      `No se puede completar desde '${cita.estado_global}'. Debe estar 'en_progreso'.`
    );
  }

  await citaModel.updateCitaCampos(id_cita, {
    estado_empleado: ESTADOS.COMPLETADA,
    estado_global: ESTADOS.COMPLETADA,
    terminado_por_empleado: id_usuario_groomer,
  });

  await movModel.logMovimiento({
    id_cita,
    tipo_movimiento: TIPO_MOVIMIENTO.COMPLETADA,
    fecha_anterior: null,
    fecha_nueva: cita.fecha_cita,
    id_usuario_origen: id_usuario_groomer,
    descripcion: 'Cita completada por el groomer',
  });

  await auditLogModel.logAction({
    id_usuario: id_usuario_groomer,
    accion: 'cita_completada',
    detalle: `Cita ${id_cita} -> completada`,
    ip_address: meta.ip || null,
    user_agent: meta.user_agent || null,
  });

  return await citaModel.findCitaById(id_cita);
}

// ============================================================
// PAGAR CITA (cliente)
// ============================================================
const METODOS_PAGO_VALIDOS = ['EFECTIVO', 'QR', 'TRANSFERENCIA'];

async function pagarCita({ id_cita, id_usuario_cliente, metodo_pago, opinion = null, meta = {} }) {
  if (!METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
    throw new ServiceError(400, "metodo_pago debe ser 'EFECTIVO', 'QR' o 'TRANSFERENCIA'");
  }

  const cita = await citaModel.findCitaById(id_cita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');
  if (cita.id_usuario_cliente !== id_usuario_cliente) throw new ServiceError(403, 'No es tu cita');
  if (cita.estado_global !== 'completada') {
    throw new ServiceError(400, 'Solo se pueden pagar citas completadas');
  }
  if (cita.pagado) throw new ServiceError(409, 'Esta cita ya fue pagada');

  // Usa el precio ajustado por tamaño si existe; si no, cae al precio base del servicio
  const precio = parseFloat(cita.precio_calculado ?? cita.precio ?? 0);
  if (precio <= 0) throw new ServiceError(400, 'El servicio no tiene precio definido. Contacta a recepción.');

  const cajaActiva = await cajaModel.findCajaActiva();
  if (!cajaActiva) throw new ServiceError(409, 'No hay caja activa. Contacta a recepción para procesar el pago.');

  const id_cliente = await clienteModel.findIdClienteByUsuario(id_usuario_cliente);
  if (!id_cliente || cita.id_cliente !== id_cliente) throw new ServiceError(403, 'No es tu cita');

  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');

    await cajaModel.createTransaccion({
      id_caja: cajaActiva.id_caja,
      tipo: 'INGRESO',
      monto: precio,
      descripcion: `Pago cita: ${cita.servicio_nombre} — ${cita.mascota_nombre}`,
      id_usuario_solicita: id_usuario_cliente,
      id_referencia: id_cita,
      metodo_pago,
    }, dbClient);

    await citaModel.updateCitaCampos(id_cita, { pagado: true }, dbClient);

    let opinion_result = null;
    if (opinion && opinion.calificacion) {
      const cal = parseInt(opinion.calificacion);
      if (!isNaN(cal) && cal >= 1 && cal <= 5) {
        const existente = await opinionModel.findByCita(id_cita);
        if (!existente) {
          opinion_result = await opinionModel.createOpinion(
            { id_cita, id_cliente, calificacion: cal, comentario: opinion.comentario || null },
            dbClient
          );
        }
      }
    }

    await auditLogModel.logAction({
      id_usuario: id_usuario_cliente,
      accion: 'CITA_PAGADA',
      detalle: JSON.stringify({ id_cita, monto: precio, metodo_pago, id_caja: cajaActiva.id_caja }),
      ip_address: meta.ip || null,
      user_agent: meta.user_agent || null,
    }, dbClient);

    await dbClient.query('COMMIT');
    return { pagado: true, monto: precio, metodo_pago, opinion: opinion_result };
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

module.exports = {
  ServiceError,
  crearCita,
  confirmarCita,
  reprogramarCita,
  cancelarCita,
  marcarNoAsistio,
  marcarEnProgreso,
  completarCita,
  pagarCita,
  // re-exportados por conveniencia para controllers/listados
  listarMovimientos: movModel.listMovimientosDeCita,
  listarGroomersDeCita: ctModel.listGroomersDeCita,
};
