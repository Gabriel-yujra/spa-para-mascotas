// src/api/clienteApi.js
import http from './http';

export const clienteApi = {
  getMiPerfil() {
    return http.get('/clientes/me').then((r) => r.data);
  },

  updateMiPerfil(data) {
    return http.put('/clientes/me', data).then((r) => r.data);
  },
};
