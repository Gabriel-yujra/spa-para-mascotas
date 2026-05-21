// src/api/servicioApi.js
import http from './http';

export const servicioApi = {
  getServicios() {
    return http.get('/servicios').then((r) => r.data);
  },
};
