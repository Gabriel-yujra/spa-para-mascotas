// src/services/agendaService.js
// Lógica de negocio del módulo "agenda y slots".
//
// Mantiene la separación: los modelos solo hablan SQL; este servicio combina
// modelos + reglas de negocio; el controller solo orquesta HTTP.
//
// La función central es `calcularDisponibilidad(...)`. Está diseñada para ser
// reutilizable desde el futuro módulo de "gestión de citas" (validar un slot
// antes de crear la cita).

const servicioModel = require('../models/servicioModel');
const mascotaModel = require('../models/mascotaModel');
const trabajadorModel = require('../models/trabajadorModel');
const citaTrabajadorModel = require('../models/citaTrabajadorModel');
const bloqueoAgendaModel = require('../models/bloqueoAgendaModel');

const {
  HORA_APERTURA, HORA_CIERRE, SLOT_GRAIN_MIN, esDiaLaboral,
} = require('../utils/agendaConfig');
const {
  buildDate, addMinutes, hhmmToMinutes, minutesToHHMM,
  generarPuntosDeInicio, intervalosSolapan,
} = require('../utils/timeUtils');

/**
 * Calcula la duración real (en minutos) de un servicio aplicado a una mascota,
 * usando servicio.factor_tamano_raza (JSONB) y mascota.tamano.
 *
 * Forma esperada de factor_tamano_raza (libre, pero típicamente):
 *   { "pequeno": 1.0, "mediano": 1.2, "grande": 1.5, "gigante": 1.8 }
 *
 * Si no hay factor aplicable, usa 1.0.
 * Se redondea al múltiplo de 5 minutos hacia arriba (para no tener slots con
 * duraciones raras como 47 min).
 */
function calcularDuracionAjustada(servicio, mascota) {
  const base = parseInt(servicio.duracion_estimada_min, 10);
  if (!Number.isFinite(base) || base <= 0) {
    throw new Error('Servicio sin duración válida');
  }

  let factor = 1.0;
  const tabla = servicio.factor_tamano_raza;
  if (tabla && typeof tabla === 'object' && mascota?.tamano) {
    const k = String(mascota.tamano).toLowerCase();
    if (typeof tabla[k] === 'number' && tabla[k] > 0) {
      factor = tabla[k];
    }
  }

  const ajustada = base * factor;
  // Redondeo al múltiplo de 5 hacia arriba
  return Math.ceil(ajustada / 5) * 5;
}

/**
 * Evalúa la disponibilidad de un groomer en un rango de tiempo, dadas:
 *   - sus asignaciones del día (precargadas para evitar N queries)
 *   - el set de groomers bloqueados ese día
 *   - el servicio (permite_doble_booking y capacidad_simultanea del groomer)
 *
 * Devuelve:
 *   { ocupadas, libre: boolean, capacidad: number }
 */
function evaluarGroomerEnSlot({
  groomer,
  rangoStart, rangoEnd,
  asignacionesDelDia,
  groomersBloqueadosSet,
  servicio,
}) {
  if (groomersBloqueadosSet.has(groomer.id_trabajador)) {
    return { ocupadas: 0, libre: false, capacidad: 0, motivo: 'bloqueado' };
  }

  // Capacidad efectiva: si el servicio no permite doble booking, fuerza 1.
  const capacidad = servicio.permite_doble_booking
    ? Math.max(1, parseInt(groomer.capacidad_simultanea, 10) || 1)
    : 1;

  let ocupadas = 0;
  for (const asig of asignacionesDelDia) {
    if (asig.id_trabajador !== groomer.id_trabajador) continue;
    // fecha_fin puede ser NULL en datos legados; lo tratamos como fecha_inicio
    const aStart = new Date(asig.fecha_inicio);
    const aEnd = asig.fecha_fin ? new Date(asig.fecha_fin) : aStart;
    if (intervalosSolapan(aStart, aEnd, rangoStart, rangoEnd)) {
      ocupadas++;
    }
  }

  return {
    ocupadas,
    libre: ocupadas < capacidad,
    capacidad,
  };
}

/**
 * Función pública principal.
 *
 * @param {Object} args
 * @param {string} args.fecha           'YYYY-MM-DD'
 * @param {string} args.id_servicio
 * @param {string} args.id_mascota
 * @param {string|null} args.id_trabajador   filtro opcional: solo este groomer
 * @returns {Promise<{
 *   fecha, servicio, duracion_ajustada_min, dia_laboral,
 *   bloqueos_globales, slots
 * }>}
 */
async function calcularDisponibilidad({ fecha, id_servicio, id_mascota, id_trabajador = null }) {
  // ----- 1. Validaciones de existencia / activo -----
  const servicio = await servicioModel.findServicioParaAgenda(id_servicio);
  if (!servicio) return { error: { status: 404, message: 'Servicio no encontrado' } };
  if (!servicio.activo) return { error: { status: 400, message: 'Servicio no activo' } };

  const mascota = await mascotaModel.findMascotaParaAgenda(id_mascota);
  if (!mascota) return { error: { status: 404, message: 'Mascota no encontrada' } };

  // ----- 2. Día laboral / bloqueos globales -----
  const bloqueosGlobales = await bloqueoAgendaModel.listBloqueosGlobales(fecha);
  if (!esDiaLaboral(fecha) || bloqueosGlobales.length > 0) {
    return {
      fecha,
      servicio: { id_servicio: servicio.id_servicio, nombre: servicio.nombre },
      duracion_ajustada_min: calcularDuracionAjustada(servicio, mascota),
      dia_laboral: false,
      bloqueos_globales: bloqueosGlobales,
      slots: [],
    };
  }

  // ----- 3. Duración ajustada -----
  const duracion = calcularDuracionAjustada(servicio, mascota);

  // ----- 4. Cargar contexto del día (una sola query cada uno) -----
  const [groomersTodos, asignaciones, groomersBloqueados] = await Promise.all([
    trabajadorModel.listGroomersActivos(),
    citaTrabajadorModel.listAsignacionesDeDia(fecha),
    bloqueoAgendaModel.listGroomersBloqueadosEnFecha(fecha),
  ]);

  // Filtro por groomer específico si vino el query param
  const groomers = id_trabajador
    ? groomersTodos.filter((g) => g.id_trabajador === id_trabajador)
    : groomersTodos;

  if (groomers.length === 0) {
    return {
      fecha,
      servicio: { id_servicio: servicio.id_servicio, nombre: servicio.nombre },
      duracion_ajustada_min: duracion,
      dia_laboral: true,
      bloqueos_globales: [],
      slots: [],
    };
  }

  const groomersBloqueadosSet = new Set(groomersBloqueados);

  // ----- 5. Generar la rejilla de candidatos -----
  const puntosInicio = generarPuntosDeInicio(HORA_APERTURA, HORA_CIERRE, SLOT_GRAIN_MIN);
  const cierreMin = hhmmToMinutes(HORA_CIERRE);

  const slots = [];

  for (const horaInicio of puntosInicio) {
    const startMin = hhmmToMinutes(horaInicio);
    const endMin   = startMin + duracion;

    // Regla "no permite agendar un servicio largo en un hueco corto":
    // si el slot no cabe antes del cierre, lo descartamos completamente.
    if (endMin > cierreMin) continue;

    const horaFin = minutesToHHMM(endMin);
    const rangoStart = buildDate(fecha, horaInicio);
    const rangoEnd   = addMinutes(rangoStart, duracion);

    // ----- 6. Evaluar cada groomer en este slot -----
    const groomersEvaluados = groomers.map((g) => {
      const ev = evaluarGroomerEnSlot({
        groomer: g,
        rangoStart, rangoEnd,
        asignacionesDelDia: asignaciones,
        groomersBloqueadosSet,
        servicio,
      });
      return {
        id_trabajador: g.id_trabajador,
        nombre: g.nombre_usuario,
        especialidad: g.especialidad,
        capacidad: ev.capacidad,
        ocupadas: ev.ocupadas,
        libre: ev.libre,
        motivo: ev.motivo,
      };
    });

    const groomersDisponibles = groomersEvaluados.filter((g) => g.libre);

    // Clasificación del slot:
    //   libre     → todos los groomers tienen cupo (ocupadas=0)
    //   parcial   → al menos uno libre, alguno con ocupación o bloqueado
    //   ocupado   → ninguno libre
    let estado;
    if (groomersDisponibles.length === 0) estado = 'ocupado';
    else if (groomersDisponibles.length === groomers.length &&
             groomersDisponibles.every((g) => g.ocupadas === 0)) estado = 'libre';
    else estado = 'parcial';

    slots.push({
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      duracion_min: duracion,
      estado,
      groomers_disponibles_count: groomersDisponibles.length,
      groomers_disponibles: groomersDisponibles.map((g) => ({
        id_trabajador: g.id_trabajador,
        nombre: g.nombre,
        especialidad: g.especialidad,
        ocupadas: g.ocupadas,
        capacidad: g.capacidad,
      })),
      // Diagnóstico — útil para vista admin / debug:
      groomers_evaluados: groomersEvaluados,
    });
  }

  return {
    fecha,
    servicio: {
      id_servicio: servicio.id_servicio,
      nombre: servicio.nombre,
      duracion_base_min: servicio.duracion_estimada_min,
      permite_doble_booking: servicio.permite_doble_booking,
    },
    mascota: { id_mascota: mascota.id_mascota, tamano: mascota.tamano },
    duracion_ajustada_min: duracion,
    horario_laboral: { apertura: HORA_APERTURA, cierre: HORA_CIERRE, grain_min: SLOT_GRAIN_MIN },
    dia_laboral: true,
    bloqueos_globales: [],
    slots,
  };
}

/**
 * Dado un slot concreto (fecha + hora_inicio + servicio + mascota),
 * devuelve qué groomers pueden tomar esa cita.
 * Es un atajo sobre calcularDisponibilidad: filtra al slot exacto.
 */
async function groomersDisponiblesEnSlot({ fecha, hora_inicio, id_servicio, id_mascota }) {
  const disp = await calcularDisponibilidad({ fecha, id_servicio, id_mascota });
  if (disp.error) return disp;
  if (!disp.dia_laboral) {
    return { fecha, hora_inicio, dia_laboral: false, groomers_disponibles: [] };
  }
  const slot = disp.slots.find((s) => s.hora_inicio === hora_inicio);
  if (!slot) {
    return {
      fecha,
      hora_inicio,
      dia_laboral: true,
      error: { status: 400, message: 'El slot solicitado no encaja en el horario o el servicio no cabe antes del cierre.' },
    };
  }
  return {
    fecha,
    hora_inicio: slot.hora_inicio,
    hora_fin: slot.hora_fin,
    duracion_min: slot.duracion_min,
    estado: slot.estado,
    groomers_disponibles: slot.groomers_disponibles,
  };
}

module.exports = {
  // funciones públicas
  calcularDisponibilidad,
  groomersDisponiblesEnSlot,
  // exportamos los helpers internos por si el módulo de gestión de citas
  // necesita reusar el cálculo de duración o la evaluación de slot:
  calcularDuracionAjustada,
  evaluarGroomerEnSlot,
};
