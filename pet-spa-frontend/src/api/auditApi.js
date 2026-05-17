// src/api/auditApi.js
import http from './http';

/**
 * Limpia un objeto de filtros: elimina claves vacías o nulas.
 */
function cleanParams(params = {}) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

export const auditApi = {
  /**
   * GET /api/audit-log
   * params soportados: from, to, accion, id_usuario, page, pageSize
   */
  listLogs(params = {}) {
    return http
      .get('/audit-log', { params: cleanParams(params) })
      .then((r) => r.data);
  },

  /**
   * GET /api/audit-log/export — devuelve hasta 5000 registros para descarga.
   */
  exportLogs(params = {}) {
    return http
      .get('/audit-log/export', { params: cleanParams(params) })
      .then((r) => r.data);
  },
};
