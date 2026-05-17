// src/utils/roles.js
// REEMPLAZO completo. Cambios:
//   + RECEPCION y GROOMER añadidos a ROLES.
//   + ROLE_LABELS para mostrar etiquetas amigables en la UI.
//   + Helpers: isStaff, isAdminLike, ASSIGNABLE_BY_ADMIN.

export const ROLES = {
  JEFE:      'jefe',
  ADMIN:     'admin',
  EMPLEADO:  'trabajador',
  CLIENTE:   'cliente',
  RECEPCION: 'recepcion',  // NUEVO
  GROOMER:   'groomer',    // NUEVO
};

/**
 * Etiquetas amigables para la UI.
 * Uso en plantillas: roleLabel(auth.role)
 */
export const ROLE_LABELS = {
  [ROLES.JEFE]:      'Jefe',
  [ROLES.ADMIN]:     'Administrador',
  [ROLES.EMPLEADO]:  'Trabajador',
  [ROLES.CLIENTE]:   'Cliente',
  [ROLES.RECEPCION]: 'Recepción',
  [ROLES.GROOMER]:   'Groomer',
};

/**
 * Devuelve la etiqueta amigable de un rol; si no se reconoce, devuelve el string crudo.
 */
export function roleLabel(role) {
  if (!role) return '';
  return ROLE_LABELS[role] || role;
}

/**
 * Roles que pertenecen al "staff" del spa (todos los que NO son cliente).
 */
export const STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.JEFE,
  ROLES.EMPLEADO,
  ROLES.RECEPCION,
  ROLES.GROOMER,
];

/**
 * Roles que se ofrecen en el <select> de creación de empleados.
 * Coherente con backend.canAssignRole para el caso "creator = admin".
 */
export const ASSIGNABLE_BY_ADMIN = [
  ROLES.ADMIN,
  ROLES.EMPLEADO,
  ROLES.RECEPCION,
  ROLES.GROOMER,
];

/**
 * ¿El rol del usuario está dentro de la lista permitida?
 */
export function hasRole(userRole, allowedRoles = []) {
  return allowedRoles.includes(userRole);
}

/**
 * ¿Es personal del spa (no cliente)?
 */
export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * ¿Tiene poder de administración (admin o jefe)?
 * Útil para mostrar/ocultar enlaces de gestión.
 */
export function isAdminLike(role) {
  return role === ROLES.ADMIN || role === ROLES.JEFE;
}
