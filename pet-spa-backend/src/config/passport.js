// src/config/passport.js
// Configuración de la estrategia JWT para Passport
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const userModel = require('../models/userModel');

module.exports = (passport) => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    new JwtStrategy(opts, async (jwtPayload, done) => {
      try {
        // jwtPayload viene de jwtUtils.signToken: { id_usuario, id_rol, rol_name }
        const user = await userModel.findUserWithRoleById(jwtPayload.id_usuario);

        if (!user) {
          return done(null, false);
        }

        // Verificar que el usuario siga activo
        if (user.estado !== 'activo') {
          return done(null, false);
        }

        // Lo que se adjunta a req.user
        return done(null, {
          id_usuario: user.id_usuario,
          id_rol: user.id_rol,
          rol_name: user.rol_name,
          email: user.email,
          nombre: user.nombre,
          debe_cambiar_password: user.debe_cambiar_password,
        });
      } catch (err) {
        return done(err, false);
      }
    })
  );
};
