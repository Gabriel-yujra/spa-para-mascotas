// src/utils/rolesUtils.js
// REEMPLAZO completo del archivo existente.
// Cambios respecto a la versión anterior:
//   + Constantes RECEPCION y GROOMER (valores en minúsculas para coherencia con BD).
//   + canAssignRole: admin/jefe pueden asignar recepcion y groomer.
//   + Helpers nuevos: isStaffRole, STAFF_ROLES, ASSIGNABLE_BY_ADMIN.
//
// IMPORTANTE: la lógica anterior (admin, jefe, trabajador, cliente) no cambia.

const ROLES = {
  JEFE:      'jefe',
  ADMIN:     'admin',
  EMPLEADO:  'trabajador',
  CLIENTE:   'cliente',
  RECEPCION: 'recepcion',  // NUEVO
  GROOMER:   'groomer',    // NUEVO
};

/**
 * Roles que pertenecen al "staff" (trabajan en el spa).
 * Útil para: plazo de cambio de password, restricciones de UI, etc.
 */
const STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.JEFE,
  ROLES.EMPLEADO,
  ROLES.RECEPCION,
  ROLES.GROOMER,
];

/**
 * Roles "operativos" que un admin puede asignar al crear empleados.
 * Ojo: NO incluye 'jefe' (eso solo lo puede asignar otro 'jefe')
 *      NI 'cliente' (los clientes se registran solos).
 */
const ASSIGNABLE_BY_ADMIN = [
  ROLES.ADMIN,
  ROLES.EMPLEADO,
  ROLES.RECEPCION,
  ROLES.GROOMER,
];

/**
 * Lista oficial de roles que pueden ocupar un puesto en la tabla `trabajadores`.
 * Si tu lógica futura quiere distinguir "personal de campo" del admin/jefe,
 * usá EMPLOYEE_LIKE_ROLES en lugar de STAFF_ROLES.
 */
const EMPLOYEE_LIKE_ROLES = [
  ROLES.EMPLEADO,
  ROLES.RECEPCION,
  ROLES.GROOMER,
  ROLES.JEFE,
  ROLES.ADMIN,
];

/**
 * ¿El rol del usuario está dentro de la lista permitida?
 * (sin cambios de comportamiento)
 */
function hasRole(userRoleName, allowedRoleNames = []) {
  return allowedRoleNames.includes(userRoleName);
}

/**
 * ¿El rol pertenece al staff del spa?
 */
function isStaffRole(roleName) {
  return STAFF_ROLES.includes(roleName);
}

/**
 * Reglas sobre qué rol puede crear/asignar qué rol.
 * - 'jefe' puede asignar cualquier rol.
 * - 'admin' puede asignar admin, trabajador, cliente, recepcion, groomer
 *   (NO jefe).
 * - cualquier otro: nada.
 */
function canAssignRole(creatorRoleName, targetRoleName) {
  if (creatorRoleName === ROLES.JEFE) return true;
  if (creatorRoleName === ROLES.ADMIN) {
    return [
      ROLES.ADMIN,
      ROLES.EMPLEADO,
      ROLES.CLIENTE,
      ROLES.RECEPCION,
      ROLES.GROOMER,
    ].includes(targetRoleName);
  }
  return false;
}

module.exports = {
  ROLES,
  STAFF_ROLES,
  ASSIGNABLE_BY_ADMIN,
  EMPLOYEE_LIKE_ROLES,
  hasRole,
  isStaffRole,
  canAssignRole,
};
