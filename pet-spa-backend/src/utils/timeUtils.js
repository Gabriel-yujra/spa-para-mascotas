// src/utils/timeUtils.js
// Utilidades de manejo de fechas/horas para el módulo de agenda.
// No se usa ninguna librería externa; se trabaja con strings 'HH:MM' y Date.

/**
 * Valida y normaliza una hora 'HH:MM' o 'H:MM' a 'HH:MM'.
 * Lanza si es inválida.
 */
function normalizeHHMM(hhmm) {
  if (typeof hhmm !== 'string') throw new Error(`Hora inválida: ${hhmm}`);
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`Hora inválida: ${hhmm}`);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** 'HH:MM' -> minutos desde 00:00 */
function hhmmToMinutes(hhmm) {
  const norm = normalizeHHMM(hhmm);
  const [h, m] = norm.split(':').map(Number);
  return h * 60 + m;
}

/** minutos desde 00:00 -> 'HH:MM' */
function minutesToHHMM(total) {
  const t = Math.max(0, Math.floor(total));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Combina 'YYYY-MM-DD' + 'HH:MM' en un Date interpretado en zona local del servidor.
 * Suficiente para Pet Spa (un solo huso horario, BO). Si en el futuro hay multi-tz,
 * conviene migrar a luxon/date-fns-tz.
 */
function buildDate(fechaYMD, hhmm) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaYMD)) throw new Error(`Fecha inválida: ${fechaYMD}`);
  const [y, mo, d] = fechaYMD.split('-').map(Number);
  const [h, mi] = normalizeHHMM(hhmm).split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/** Suma minutos a un Date y devuelve un Date nuevo. */
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Genera el listado de "puntos de partida" candidatos para slots en un día.
 * Ejemplo: open=09:00, close=18:00, grain=30 → ['09:00','09:30',...,'17:30']
 * El último candidato debe poder caber al menos un slot mínimo; el cierre real
 * por duración del servicio se hace fuera.
 */
function generarPuntosDeInicio(openHHMM, closeHHMM, grainMinutes) {
  const start = hhmmToMinutes(openHHMM);
  const end = hhmmToMinutes(closeHHMM);
  if (end <= start) throw new Error('close debe ser > open');
  if (grainMinutes <= 0) throw new Error('grain debe ser > 0');

  const out = [];
  for (let t = start; t < end; t += grainMinutes) {
    out.push(minutesToHHMM(t));
  }
  return out;
}

/**
 * ¿Los intervalos [aStart, aEnd) y [bStart, bEnd) se solapan?
 * Usado para validar slots en JS (la versión SQL está en los models).
 */
function intervalosSolapan(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

module.exports = {
  normalizeHHMM,
  hhmmToMinutes,
  minutesToHHMM,
  buildDate,
  addMinutes,
  generarPuntosDeInicio,
  intervalosSolapan,
};
