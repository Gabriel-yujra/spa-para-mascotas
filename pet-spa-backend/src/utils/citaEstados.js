// src/utils/citaEstados.js
// Estados válidos de una cita y reglas de transición.
//
// Mantener todas las constantes aquí evita strings mágicos en controllers,
// services y models. Si en el futuro hay que renombrar un estado, se cambia
// solo en este archivo.

const ESTADOS = {
  PENDIENTE:    'pendiente',
  CONFIRMADA:   'confirmada',
  EN_PROGRESO:  'en_progreso',
  COMPLETADA:   'completada',
  CANCELADA:    'cancelada',
  NO_ASISTIO:   'no_asistio',
  REPROGRAMADA: 'reprogramada',
};

const ESTADOS_TERMINALES = new Set([
  ESTADOS.COMPLETADA,
  ESTADOS.CANCELADA,
  ESTADOS.NO_ASISTIO,
]);

// Estados a partir de los cuales NO se puede cambiar el groomer.
const ESTADOS_GROOMER_INMUTABLE = new Set([
  ESTADOS.CONFIRMADA,
  ESTADOS.EN_PROGRESO,
  ESTADOS.COMPLETADA,
  ESTADOS.NO_ASISTIO,
]);

// Mapa de transiciones permitidas sobre `estado_global`.
// Cada clave: estado actual. Cada valor: array de estados a los que se puede pasar.
const TRANSICIONES = {
  [ESTADOS.PENDIENTE]:    [ESTADOS.CONFIRMADA, ESTADOS.CANCELADA, ESTADOS.REPROGRAMADA],
  [ESTADOS.CONFIRMADA]:   [ESTADOS.EN_PROGRESO, ESTADOS.REPROGRAMADA, ESTADOS.CANCELADA, ESTADOS.NO_ASISTIO],
  [ESTADOS.REPROGRAMADA]: [ESTADOS.CONFIRMADA, ESTADOS.CANCELADA],
  [ESTADOS.EN_PROGRESO]:  [ESTADOS.COMPLETADA, ESTADOS.CANCELADA],
  [ESTADOS.COMPLETADA]:   [],
  [ESTADOS.CANCELADA]:    [],
  [ESTADOS.NO_ASISTIO]:   [],
};

/**
 * ¿La transición currentEstado → newEstado está permitida?
 */
function canTransition(currentEstado, newEstado) {
  const allowed = TRANSICIONES[currentEstado];
  if (!allowed) return false;
  return allowed.includes(newEstado);
}

function isTerminal(estado) {
  return ESTADOS_TERMINALES.has(estado);
}

/**
 * Tipos de movimiento que registramos en `cita_movimientos.tipo_movimiento`.
 * Strings libres en BD, pero mantenidos aquí como constantes para evitar typos.
 */
const TIPO_MOVIMIENTO = {
  CREACION:               'creacion',
  CONFIRMACION:           'confirmacion',
  REPROGRAMACION:         'reprogramacion',
  CANCELACION_CLIENTE:    'cancelacion_cliente',
  CANCELACION_RECEPCION:  'cancelacion_recepcion',
  NO_ASISTIO:             'no_asistio',
  EN_PROGRESO:            'en_progreso',
  COMPLETADA:             'completada',
};

module.exports = {
  ESTADOS,
  ESTADOS_TERMINALES,
  ESTADOS_GROOMER_INMUTABLE,
  TRANSICIONES,
  TIPO_MOVIMIENTO,
  canTransition,
  isTerminal,
};
