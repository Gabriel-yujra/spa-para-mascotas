// src/api/servicioApi.js
import http from './http';

export const servicioApi = {
  getServicios() {
    return http.get('/servicios').then((r) => r.data);
  },
  getServiciosAdmin() {
    return http.get('/servicios/admin').then((r) => r.data);
  },
  createServicio(payload) {
    return http.post('/servicios', payload).then((r) => r.data);
  },
  updateServicio(id, payload) {
    return http.put(`/servicios/${id}`, payload).then((r) => r.data);
  },
  updateServicioEstado(id, activo) {
    return http.patch(`/servicios/${id}/estado`, { activo }).then((r) => r.data);
  },
};
