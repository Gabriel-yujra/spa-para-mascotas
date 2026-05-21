// src/api/agendaApi.js
import http from './http';

export const agendaApi = {
  // GET /api/agenda/disponibilidad?fecha=&id_servicio=&id_mascota=
  // Response: { fecha, dia_laboral, slots: [{ hora_inicio, hora_fin, duracion_min, estado, groomers_disponibles_count }] }
  getDisponibilidad({ fecha, id_servicio, id_mascota }) {
    return http.get('/agenda/disponibilidad', {
      params: { fecha, id_servicio, id_mascota },
    }).then((r) => r.data);
  },
};
