// src/api/mascotaApi.js
import http from './http';

export const mascotaApi = {
  getMisMascotas() {
    return http.get('/mascotas/mias').then((r) => r.data);
  },

  createMascota(payload) {
    return http.post('/mascotas', payload).then((r) => r.data);
  },

  updateMascota(id, payload) {
    return http.put(`/mascotas/${id}`, payload).then((r) => r.data);
  },

  deleteMascota(id) {
    return http.delete(`/mascotas/${id}`).then((r) => r.data);
  },

  uploadMascotaFoto(id, file) {
    const fd = new FormData();
    fd.append('foto', file);
    return http.post(`/mascotas/${id}/foto`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
