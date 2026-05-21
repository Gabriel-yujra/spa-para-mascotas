import http from './http';

export const groomingApi = {
  // GET /api/grooming/agenda?fecha=YYYY-MM-DD (fecha is optional)
  getAgenda(params = {}) {
    return http.get('/grooming/agenda', { params }).then((r) => r.data);
  },

  // GET /api/grooming/fichas/:idCita
  getFicha(idCita) {
    return http.get(`/grooming/fichas/${idCita}`).then((r) => r.data);
  },

  // PUT /api/grooming/fichas/:idCita
  updateFicha(idCita, payload) {
    return http.put(`/grooming/fichas/${idCita}`, payload).then((r) => r.data);
  },
};
