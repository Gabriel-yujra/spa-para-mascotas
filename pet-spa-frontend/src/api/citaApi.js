// src/api/citaApi.js
import http from './http';

export const citaApi = {
  // ── Cliente ───────────────────────────────────────────────────

  // GET /api/citas/mis-citas?futuras=true|false
  getMisCitas({ soloFuturas = false } = {}) {
    return http.get('/citas/mis-citas', { params: { futuras: soloFuturas } }).then((r) => r.data);
  },

  // POST /api/citas
  crearCita(payload) {
    return http.post('/citas', payload).then((r) => r.data);
  },

  // PATCH /api/citas/:id/cancelar-cliente
  cancelarCita(id, body = {}) {
    return http.patch(`/citas/${id}/cancelar-cliente`, body).then((r) => r.data);
  },

  // ── Staff: Recepción / Admin / Jefe ───────────────────────────

  // GET /api/citas/recepcion?fecha=YYYY-MM-DD&estado=...&groomerId=...
  listarCitasRecepcion(params = {}) {
    return http.get('/citas/recepcion', { params }).then((r) => r.data);
  },

  // PATCH /api/citas/:id/confirmar
  confirmarCita(id) {
    return http.patch(`/citas/${id}/confirmar`).then((r) => r.data);
  },

  // PATCH /api/citas/:id/reprogramar
  // body: { nueva_fecha, nueva_hora_inicio, nuevo_id_trabajador? }
  reprogramarCita(id, body) {
    return http.patch(`/citas/${id}/reprogramar`, body).then((r) => r.data);
  },

  // PATCH /api/citas/:id/cancelar  (staff cancel — requires motivo)
  cancelarCitaRecepcion(id, body) {
    return http.patch(`/citas/${id}/cancelar`, body).then((r) => r.data);
  },

  // PATCH /api/citas/:id/no-asistio
  noAsistio(id) {
    return http.patch(`/citas/${id}/no-asistio`).then((r) => r.data);
  },

  // POST /api/citas/:id/pagar-cliente
  // payload: { metodo_pago: 'EFECTIVO'|'QR'|'TRANSFERENCIA', opinion?: { calificacion, comentario } }
  pagarCita(id, payload) {
    return http.post(`/citas/${id}/pagar-cliente`, payload).then((r) => r.data);
  },
};
