// src/api/cajaApi.js
import http from './http';

export const cajaApi = {
  getCajaActual() {
    return http.get('/caja/actual').then((r) => r.data);
  },
  abrirCaja(payload) {
    return http.post('/caja', payload).then((r) => r.data);
  },
  cerrarCaja(id) {
    return http.patch(`/caja/${id}/cerrar`).then((r) => r.data);
  },
  crearTransaccion(payload) {
    return http.post('/caja/transacciones', payload).then((r) => r.data);
  },
};
