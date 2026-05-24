// src/api/agendaApi.js
import http from './http';

export const agendaApi = {
  // GET /api/agenda/disponibilidad?fecha=&id_servicio=&id_mascota=
  getDisponibilidad({ fecha, id_servicio, id_mascota }) {
    return http.get('/agenda/disponibilidad', {
      params: { fecha, id_servicio, id_mascota },
    }).then((r) => r.data);
  },

  // GET /api/agenda/groomers-disponibles?fecha=&hora_inicio=&id_servicio=&id_mascota=
  // Response: { fecha, hora_inicio, dia_laboral, groomers_disponibles: [{ id_trabajador, nombre, especialidad, ocupadas, capacidad }] }
  getGroomersDisponibles({ fecha, hora_inicio, id_servicio, id_mascota }) {
    return http.get('/agenda/groomers-disponibles', {
      params: { fecha, hora_inicio, id_servicio, id_mascota },
    }).then((r) => r.data);
  },

  // GET /api/agenda/groomers  (staff: admin, jefe, recepcion)
  // Response: { groomers: [{ id_trabajador, nombre_usuario, especialidad, ... }] }
  listarGrromers() {
    return http.get('/agenda/groomers').then((r) => r.data);
  },

  // GET /api/agenda/bloqueos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD  (staff)
  listarBloqueos({ desde, hasta }) {
    return http.get('/agenda/bloqueos', { params: { desde, hasta } }).then((r) => r.data);
  },

  // POST /api/agenda/bloqueos  (staff)
  // payload: { fecha, tipo, motivo?, id_trabajador? }
  crearBloqueo(payload) {
    return http.post('/agenda/bloqueos', payload).then((r) => r.data);
  },

  // DELETE /api/agenda/bloqueos/:id  (staff)
  eliminarBloqueo(id) {
    return http.delete(`/agenda/bloqueos/${id}`).then((r) => r.data);
  },
};
