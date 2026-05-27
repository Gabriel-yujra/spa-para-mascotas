import http from './http';

export const reportesApi = {
  // GET /api/reportes/ingresos-diarios?desde=&hasta=
  getIngresosDiarios(params = {}) {
    return http.get('/reportes/ingresos-diarios', { params }).then((r) => r.data);
  },

  // GET /api/reportes/top-servicios?desde=&hasta=
  getTopServicios(params = {}) {
    return http.get('/reportes/top-servicios', { params }).then((r) => r.data);
  },

  // GET /api/reportes/servicios-por-groomer?desde=&hasta=
  getServiciosPorGroomer(params = {}) {
    return http.get('/reportes/servicios-por-groomer', { params }).then((r) => r.data);
  },

  // GET /api/reportes/consumo-elevado?desde=&hasta=
  getConsumoElevado(params = {}) {
    return http.get('/reportes/consumo-elevado', { params }).then((r) => r.data);
  },
};
