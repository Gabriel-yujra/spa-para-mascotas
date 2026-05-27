import http from './http';

export const groomingApi = {
  // GET /api/grooming/agenda?fecha=YYYY-MM-DD  (fecha is optional)
  getAgenda(params = {}) {
    return http.get('/grooming/agenda', { params }).then((r) => r.data);
  },

  // GET /api/grooming/fichas/:idCita  (GROOMER — full editable)
  getFicha(idCita) {
    return http.get(`/grooming/fichas/${idCita}`).then((r) => r.data);
  },

  // PUT /api/grooming/fichas/:idCita  (GROOMER)
  updateFicha(idCita, payload) {
    return http.put(`/grooming/fichas/${idCita}`, payload).then((r) => r.data);
  },

  // GET /api/grooming/fichas/:idCita/admin  (RECEPCION / ADMIN / JEFE — read-only)
  getFichaAdmin(idCita) {
    return http.get(`/grooming/fichas/${idCita}/admin`).then((r) => r.data);
  },

  // GET /api/grooming/mis-citas/:idCita/ficha  (CLIENTE — summary)
  getFichaCliente(idCita) {
    return http.get(`/grooming/mis-citas/${idCita}/ficha`).then((r) => r.data);
  },

  // GET /api/grooming/fichas/:idCita/insumos  (GROOMER)
  getInsumos(idCita) {
    return http.get(`/grooming/fichas/${idCita}/insumos`).then((r) => r.data);
  },

  // PUT /api/grooming/fichas/:idCita/insumos  (GROOMER)
  saveInsumos(idCita, items) {
    return http.put(`/grooming/fichas/${idCita}/insumos`, { items }).then((r) => r.data);
  },

  // POST /api/grooming/fichas/:idCita/fotos  (GROOMER)
  // tipo: 'llegada' | 'salida'
  uploadFoto(idCita, file, tipo) {
    const form = new FormData();
    form.append('foto', file);
    form.append('tipo', tipo);
    return http.post(`/grooming/fichas/${idCita}/fotos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
