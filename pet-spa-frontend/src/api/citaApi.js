// src/api/citaApi.js
import http from './http';

export const citaApi = {
  // GET /api/citas/mis-citas?futuras=true|false
  getMisCitas({ soloFuturas = false } = {}) {
    return http.get('/citas/mis-citas', { params: { futuras: soloFuturas } }).then((r) => r.data);
  },

  // POST /api/citas
  // payload: { id_mascota, id_servicio, fecha_cita, hora_inicio, id_trabajador_preferido? }
  crearCita(payload) {
    return http.post('/citas', payload).then((r) => r.data);
  },

  // PATCH /api/citas/:id/cancelar-cliente
  // body: { motivo? }
  cancelarCita(id, body = {}) {
    return http.patch(`/citas/${id}/cancelar-cliente`, body).then((r) => r.data);
  },
};
