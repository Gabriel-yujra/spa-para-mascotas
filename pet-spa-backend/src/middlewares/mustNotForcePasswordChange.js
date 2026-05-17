// src/middlewares/mustNotForcePasswordChange.js
// Bloquea endpoints sensibles si el usuario aún no ha cambiado su password inicial.
// Permite que SOLO pase para el endpoint de cambio de contraseña.
module.exports = (req, res, next) => {
  if (req.user && req.user.debe_cambiar_password) {
    return res.status(403).json({
      error: 'Cambio de contraseña obligatorio',
      message: 'Debe cambiar su contraseña antes de continuar',
      mustChangePassword: true,
    });
  }
  next();
};
