// src/api/opinionApi.js
import http from './http';

export const opinionApi = {
  crearOpinion(payload) {
    return http.post('/opiniones', payload).then((r) => r.data);
  },
  getMisOpiniones() {
    return http.get('/opiniones/mis-opiniones').then((r) => r.data);
  },
  getResumen() {
    return http.get('/opiniones/resumen').then((r) => r.data);
  },
};
