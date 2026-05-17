// src/middlewares/authRequired.js
// Middleware: exige un JWT válido en Authorization: Bearer <token>
const passport = require('passport');

module.exports = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, _info) => {
    if (err) {
      return res.status(500).json({ error: 'Error de autenticación', message: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'No autorizado', message: 'Token inválido o ausente' });
    }
    req.user = user; // { id_usuario, id_rol, rol_name, email, nombre, debe_cambiar_password }
    next();
  })(req, res, next);
};
