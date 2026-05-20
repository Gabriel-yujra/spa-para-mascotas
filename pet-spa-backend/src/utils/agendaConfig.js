// src/utils/agendaConfig.js
// Configuración del horario laboral del spa.
// Se lee de variables de entorno con defaults razonables.
//
// Variables soportadas en .env:
//   SPA_HORA_APERTURA=09:00
//   SPA_HORA_CIERRE=18:00
//   SPA_SLOT_GRAIN_MIN=30          // grano de la rejilla de slots (minutos)
//   SPA_DIAS_LABORALES=1,2,3,4,5   // 0=domingo, 1=lunes, ..., 6=sábado
//
// Si en el futuro el horario laboral pasa a venir de BD (tabla `horarios_spa`),
// solo hay que cambiar este módulo. El resto del sistema no se entera.

const { normalizeHHMM } = require('./timeUtils');

const HORA_APERTURA   = normalizeHHMM(process.env.SPA_HORA_APERTURA || '09:00');
const HORA_CIERRE     = normalizeHHMM(process.env.SPA_HORA_CIERRE   || '18:00');
const SLOT_GRAIN_MIN  = parseInt(process.env.SPA_SLOT_GRAIN_MIN || '30', 10);

// Por defecto lun-vie (1..5). Domingo=0.
const DIAS_LABORALES = (process.env.SPA_DIAS_LABORALES || '1,2,3,4,5')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

/**
 * ¿La fecha 'YYYY-MM-DD' es un día laborable según la configuración?
 */
function esDiaLaboral(fechaYMD) {
  const [y, m, d] = fechaYMD.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=domingo
  return DIAS_LABORALES.includes(dow);
}

module.exports = {
  HORA_APERTURA,
  HORA_CIERRE,
  SLOT_GRAIN_MIN,
  DIAS_LABORALES,
  esDiaLaboral,
};
