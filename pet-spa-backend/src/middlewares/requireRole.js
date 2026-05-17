// src/middlewares/requireRole.js
// Middleware: exige que el rol del usuario esté entre los permitidos
const { hasRole } = require('../utils/rolesUtils');

module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    if (!hasRole(req.user.rol_name, allowedRoles)) {
      return res.status(403).json({
        error: 'Prohibido',
        message: `Rol '${req.user.rol_name}' no tiene permiso para esta acción`,
      });
    }
    next();
  };
};
