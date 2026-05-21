// src/api/clienteApi.js
import http from './http';

export const clienteApi = {
  // ── Cliente (propio perfil) ───────────────────────────────────

  getMiPerfil() {
    return http.get('/clientes/me').then((r) => r.data);
  },

  updateMiPerfil(data) {
    return http.put('/clientes/me', data).then((r) => r.data);
  },

  // ── Staff: Recepción / Admin / Jefe ───────────────────────────

  // GET /api/clientes?nombre=&email=&ci=&telefono=
  buscarClientes(params = {}) {
    return http.get('/clientes', { params }).then((r) => r.data);
  },

  // GET /api/clientes/:idCliente  → { cliente, mascotas }
  getDetalleCliente(idCliente) {
    return http.get(`/clientes/${idCliente}`).then((r) => r.data);
  },
};
