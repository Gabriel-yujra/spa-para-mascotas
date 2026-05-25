// src/api/productoApi.js
import http from './http';

export const productoApi = {
  getProductos(all = true) {
    return http.get('/productos', { params: { all: all ? 'true' : 'false' } }).then((r) => r.data);
  },
  createProducto(payload) {
    return http.post('/productos', payload).then((r) => r.data);
  },
  updateProducto(id, payload) {
    return http.put(`/productos/${id}`, payload).then((r) => r.data);
  },
  updateProductoEstado(id, estado) {
    return http.patch(`/productos/${id}/estado`, { estado }).then((r) => r.data);
  },
};
