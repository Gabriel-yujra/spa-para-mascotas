import http from './http';

export const tiendaApi = {
  getProductos() {
    return http.get('/tienda/productos').then((r) => r.data);
  },

  // Crea pedido pendiente, devuelve { id_pedido, mensaje, waLink, total, resumen }
  crearPedido(items) {
    return http.post('/tienda/pedidos', { items }).then((r) => r.data);
  },

  // Registra el pago y crea ingreso en caja; devuelve { ok, mensaje }
  pagarPedido(idPedido, metodo_pago) {
    return http.post(`/tienda/pedidos/${idPedido}/pagar`, { metodo_pago }).then((r) => r.data);
  },
};
