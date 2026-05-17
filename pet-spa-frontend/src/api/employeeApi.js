// src/api/employeeApi.js
// REEMPLAZO. Mantiene lo anterior y añade changeUserEstado.
import http from './http';

export const employeeApi = {
  list() {
    return http.get('/empleados').then((r) => r.data);
  },

  /**
   * Crear empleado. NOTA: el backend nuevo NO recibe `password`.
   * La contraseña inicial se deriva del CI.
   * payload: { full_name, email, ci, role_id, turno, telefono,
   *            especialidad, sueldo_mensual, capacidad_simultanea }
   */
  create(payload) {
    return http.post('/empleados', payload).then((r) => r.data);
  },

  update(id, fields) {
    return http.patch(`/empleados/${id}`, fields).then((r) => r.data);
  },

  listRoles() {
    return http.get('/usuarios/roles').then((r) => r.data);
  },

  /**
   * Borrado lógico / cambio de estado de usuario.
   * estado ∈ 'pendiente' | 'activo' | 'inactivo' | 'bloqueado'
   */
  changeUserEstado(id_usuario, estado) {
    return http
      .patch(`/usuarios/${id_usuario}/estado`, { estado })
      .then((r) => r.data);
  },
};
