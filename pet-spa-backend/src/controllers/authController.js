// src/controllers/authController.js
// PARCHE — Bug 2:
//   En login, el check `estado === 'inactivo'` se ejecutaba ANTES del de
//   debe_cambiar_password + plazo. Resultado: empleados nuevos creados como
//   inactivos quedaban atrapados. Ahora que createEmployee los crea como
//   'activo', este reordenamiento es defensivo: aunque alguien quede en
//   'inactivo' por error, si está dentro del plazo de cambio de password
//   inicial podrá entrar para corregirlo.
//
// El resto del archivo (registro, activación, 2FA, change-password, locking)
// se conserva tal cual.
const crypto = require('crypto');

const db = require('../config/db');
const userModel = require('../models/userModel');
const clienteModel = require('../models/clienteModel');
const rolesModel = require('../models/rolesModel');
const auditLogModel = require('../models/auditLogModel');
const activationTokenModel = require('../models/activationTokenModel');

const {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} = require('../utils/passwordUtils');
const {
  signToken,
  signTwoFAPendingToken,
  verifyTwoFAPendingToken,
} = require('../utils/jwtUtils');
const { isValidEmail, isNonEmptyString } = require('../utils/validationUtils');
const { ROLES } = require('../utils/rolesUtils');
const totpUtils = require('../utils/totpUtils');
const mailer = require('../config/mail');

const EMPLOYEE_GRACE_DAYS = parseInt(process.env.EMPLOYEE_PASSWORD_GRACE_DAYS || '7', 10);

function getRequestMeta(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const user_agent = req.headers['user-agent'] || null;
  return { ip, user_agent };
}

function isStaffRole(roleName) {
  return (
    roleName === ROLES.EMPLEADO ||
    roleName === ROLES.JEFE ||
    roleName === ROLES.ADMIN ||
    roleName === ROLES.RECEPCION ||  // si existen
    roleName === ROLES.GROOMER       // si existen
  );
}

function daysSince(date) {
  if (!date) return 0;
  const ms = Date.now() - new Date(date).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

// ============================================================
// POST /api/auth/register   (sin cambios)
// ============================================================
exports.register = async (req, res) => {
  const { nombre, email, password, telefono, ci, direccion, canal_notificacion, horarios_preferidos } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);

  if (!isNonEmptyString(nombre)) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email inválido' });
  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.valid) {
    return res.status(400).json({ error: 'Contraseña no cumple política de seguridad', details: pwdCheck.errors });
  }
  if (!isNonEmptyString(telefono)) return res.status(400).json({ error: 'El teléfono es obligatorio' });
  if (!isNonEmptyString(ci)) return res.status(400).json({ error: 'El CI es obligatorio' });
  if (!isNonEmptyString(direccion)) return res.status(400).json({ error: 'La dirección es obligatoria' });

  const dbClient = await db.getClient();
  try {
    if (await userModel.emailExists(email)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    const clienteRole = await rolesModel.findRoleByName(ROLES.CLIENTE);
    if (!clienteRole) return res.status(500).json({ error: 'Configuración inválida: rol cliente no existe' });

    const password_hash = await hashPassword(password);
    await dbClient.query('BEGIN');

    const newUser = await userModel.createUser(
      { id_rol: clienteRole.id_rol, nombre, email, password_hash, debe_cambiar_password: false, estado: 'pendiente' },
      dbClient
    );
    await clienteModel.createCliente(
      { id_usuario: newUser.id_usuario, telefono, direccion, ci, canal_notificacion: canal_notificacion || null, horarios_preferidos: horarios_preferidos || null },
      dbClient
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    await activationTokenModel.createToken({ id_usuario: newUser.id_usuario, token: rawToken }, dbClient);

    await auditLogModel.logAction(
      { id_usuario: newUser.id_usuario, accion: 'registro_cliente', detalle: `Cliente registrado con email ${email} (estado=pendiente, token enviado)`, ip_address: ip, user_agent },
      dbClient
    );

    await dbClient.query('COMMIT');

    mailer
      .sendActivationEmail({ nombre: newUser.nombre, email: newUser.email }, rawToken)
      .catch((e) => console.warn('[mail] activación falló:', e.message));

    return res.status(201).json({
      message: 'Cuenta creada. Revisa tu correo para activarla (válido 15 minutos).',
      user: { id_usuario: newUser.id_usuario, nombre: newUser.nombre, email: newUser.email, estado: newUser.estado },
    });
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    console.error('[register]', err);
    return res.status(500).json({ error: 'Error al registrar cliente', message: err.message });
  } finally {
    dbClient.release();
  }
};

// ============================================================
// POST /api/auth/activate   (sin cambios)
// ============================================================
exports.activate = async (req, res) => {
  const { token } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);
  if (!isNonEmptyString(token)) return res.status(400).json({ error: 'Token requerido' });

  const dbClient = await db.getClient();
  try {
    const record = await activationTokenModel.findByToken(token);
    if (!record) return res.status(400).json({ error: 'Token inválido' });
    if (record.used) return res.status(400).json({ error: 'Token ya utilizado' });
    if (new Date(record.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'Token expirado. Solicita uno nuevo.' });
    }

    await dbClient.query('BEGIN');
    await activationTokenModel.markUsed(record.id_token, dbClient);
    await userModel.activateUser(record.id_usuario, dbClient);
    await auditLogModel.logAction(
      { id_usuario: record.id_usuario, accion: 'activacion_cuenta', detalle: 'Cuenta activada vía token', ip_address: ip, user_agent },
      dbClient
    );
    await dbClient.query('COMMIT');

    const fresh = await userModel.findUserWithRoleById(record.id_usuario);
    const jwtToken = signToken({ id_usuario: fresh.id_usuario, id_rol: fresh.id_rol, rol_name: fresh.rol_name });

    return res.status(200).json({
      message: 'Cuenta activada correctamente',
      token: jwtToken,
      user: { id_usuario: fresh.id_usuario, nombre: fresh.nombre, email: fresh.email, rol: fresh.rol_name },
    });
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    console.error('[activate]', err);
    return res.status(500).json({ error: 'Error al activar cuenta', message: err.message });
  } finally {
    dbClient.release();
  }
};

// ============================================================
// POST /api/auth/login
// ============================================================
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);

  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // ---- BLOQUEO TEMPORAL (siempre primero) ----
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      await auditLogModel.logAction({
        id_usuario: user.id_usuario, accion: 'login_bloqueado',
        detalle: `Intento de login con cuenta bloqueada hasta ${user.lock_until}`,
        ip_address: ip, user_agent,
      });
      return res.status(423).json({
        error: 'Cuenta bloqueada temporalmente',
        message: `Tu cuenta está bloqueada por demasiados intentos. Vuelve a intentarlo después de ${new Date(user.lock_until).toLocaleString()}.`,
        lock_until: user.lock_until,
      });
    }

    // ---- ESTADO 'pendiente' (cliente sin activar) ----
    // Esto sí es un bloqueo total: no hay forma de "salir" sin activar por correo.
    if (user.estado === 'pendiente') {
      await auditLogModel.logAction({
        id_usuario: user.id_usuario, accion: 'login_fallido',
        detalle: 'Cuenta pendiente de activación', ip_address: ip, user_agent,
      });
      return res.status(403).json({ error: 'Cuenta pendiente de activación. Revisa tu correo.' });
    }

    // ---- ESTADO 'bloqueado' (administrativo, permanente) ----
    if (user.estado === 'bloqueado') {
      await auditLogModel.logAction({
        id_usuario: user.id_usuario, accion: 'login_fallido',
        detalle: 'Cuenta bloqueada permanentemente', ip_address: ip, user_agent,
      });
      return res.status(403).json({ error: 'Cuenta bloqueada. Contacta al administrador.' });
    }

    // ============================================================
    // ⚙️  CAMBIO BUG 2:
    //    El antiguo bloqueo `if (estado === 'inactivo')` se MUEVE más abajo,
    //    DESPUÉS de validar la contraseña, y se hace condicional:
    //    si el usuario tiene debe_cambiar_password=TRUE y está dentro del
    //    plazo, le permitimos entrar (encerrado en /change-password).
    //    Esto resuelve definitivamente el caso "empleado atrapado en
    //    estado=inactivo" si por alguna razón histórica quedó así.
    // ============================================================

    // ---- PASSWORD ----
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      const result = await userModel.incrementFailedLoginAttempts(user.id_usuario);
      await auditLogModel.logAction({
        id_usuario: user.id_usuario, accion: 'login_fallido',
        detalle: `Contraseña incorrecta. Intentos: ${result?.failed_login_attempts}`,
        ip_address: ip, user_agent,
      });

      if (result?.locked) {
        mailer
          .sendAccountLockedEmail({ nombre: user.nombre, email: user.email }, result.lock_until)
          .catch((e) => console.warn('[mail] alerta de bloqueo falló:', e.message));

        await auditLogModel.logAction({
          id_usuario: user.id_usuario, accion: 'cuenta_bloqueada',
          detalle: `Bloqueo automático por ${userModel.MAX_ATTEMPTS} intentos fallidos hasta ${result.lock_until}`,
          ip_address: ip, user_agent,
        });

        return res.status(423).json({
          error: 'Cuenta bloqueada temporalmente',
          message: 'Has superado el número máximo de intentos.',
          lock_until: result.lock_until,
        });
      }
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // ---- PASSWORD CORRECTA ----

    // (1) Plazo de cambio de password para staff:
    //     si el plazo venció y aún tiene debe_cambiar_password=TRUE, lo desactivamos
    //     y rechazamos el login. (Lógica preexistente, sin cambios.)
    if (
      isStaffRole(user.rol_name) &&
      user.debe_cambiar_password &&
      daysSince(user.fecha_creacion) > EMPLOYEE_GRACE_DAYS
    ) {
      await userModel.updateUserEstado(user.id_usuario, 'inactivo');
      await auditLogModel.logAction({
        id_usuario: user.id_usuario, accion: 'desactivacion_automatica',
        detalle: `Empleado no cambió su contraseña inicial dentro del plazo de ${EMPLOYEE_GRACE_DAYS} días`,
        ip_address: ip, user_agent,
      });
      return res.status(403).json({
        error: 'Cuenta desactivada',
        message: `No cambiaste tu contraseña inicial dentro de los ${EMPLOYEE_GRACE_DAYS} días permitidos. Contacta al administrador.`,
      });
    }

    // (2) Estado 'inactivo' después de validar password.
    //     Si tiene debe_cambiar_password=TRUE y aún en plazo, dejamos pasar
    //     (el usuario quedará encerrado en /change-password por el flag
    //     mustChangePassword devuelto). Si no, bloqueamos como antes.
    if (user.estado === 'inactivo') {
      const dentroDePlazo = isStaffRole(user.rol_name) &&
        user.debe_cambiar_password &&
        daysSince(user.fecha_creacion) <= EMPLOYEE_GRACE_DAYS;

      if (!dentroDePlazo) {
        await auditLogModel.logAction({
          id_usuario: user.id_usuario, accion: 'login_fallido',
          detalle: 'Cuenta inactiva', ip_address: ip, user_agent,
        });
        return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
      }
      // Continuar el flujo: la entrada está permitida solo para cambio inicial.
    }

    // Resetear intentos
    await userModel.resetLoginAttempts(user.id_usuario);

    // 2FA admin
    if (user.two_factor_enabled && user.rol_name === ROLES.ADMIN) {
      const twoFAToken = signTwoFAPendingToken(user.id_usuario);
      await auditLogModel.logAction({
        id_usuario: user.id_usuario, accion: 'login_2fa_pendiente',
        detalle: '2FA requerido para completar el login', ip_address: ip, user_agent,
      });
      return res.status(200).json({
        requires2FA: true,
        twoFAToken,
        message: 'Ingresa tu código TOTP para completar el inicio de sesión',
      });
    }

    // Login normal
    await userModel.updateLoginInfo(user.id_usuario, ip, user_agent);
    const token = signToken({ id_usuario: user.id_usuario, id_rol: user.id_rol, rol_name: user.rol_name });
    await auditLogModel.logAction({
      id_usuario: user.id_usuario, accion: 'login',
      detalle: `Login exitoso (rol=${user.rol_name})`, ip_address: ip, user_agent,
    });

    if (user.debe_cambiar_password) {
      return res.status(200).json({
        token,
        mustChangePassword: true,
        message: 'Debe cambiar su contraseña antes de continuar',
      });
    }

    return res.status(200).json({
      token,
      mustChangePassword: false,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol_name,
        two_factor_enabled: !!user.two_factor_enabled, // ← FIX bug 1: incluir explícitamente
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Error en login', message: err.message });
  }
};

// ============================================================
// POST /api/auth/change-password   (sin cambios funcionales)
// ============================================================
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);
  const id_usuario = req.user.id_usuario;

  if (!isNonEmptyString(oldPassword) || !isNonEmptyString(newPassword)) {
    return res.status(400).json({ error: 'oldPassword y newPassword son obligatorios' });
  }
  const pwdCheck = validatePasswordStrength(newPassword);
  if (!pwdCheck.valid) {
    return res.status(400).json({
      error: 'La nueva contraseña no cumple política de seguridad',
      details: pwdCheck.errors,
    });
  }
  if (oldPassword === newPassword) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
  }

  try {
    const user = await userModel.findUserById(id_usuario);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const ok = await comparePassword(oldPassword, user.password_hash);
    if (!ok) {
      await auditLogModel.logAction({
        id_usuario, accion: 'cambio_password_fallido',
        detalle: 'oldPassword incorrecta', ip_address: ip, user_agent,
      });
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const newHash = await hashPassword(newPassword);

    // Si era el primer cambio o estaba 'inactivo' por flujo de empleado,
    // dejamos la cuenta como 'activo'.
    const wasFirstChange = user.debe_cambiar_password === true;
    const targetEstado = wasFirstChange && user.estado !== 'activo' ? 'activo' : null;

    await userModel.updatePassword(id_usuario, newHash, false, targetEstado);

    await auditLogModel.logAction({
      id_usuario, accion: 'cambio_password',
      detalle: wasFirstChange
        ? 'Cambio de contraseña inicial: cuenta activada'
        : 'Contraseña actualizada',
      ip_address: ip, user_agent,
    });

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ error: 'Error al cambiar contraseña', message: err.message });
  }
};

// ============================================================
// GET /api/auth/me
// FIX BUG 1: incluir explícitamente two_factor_enabled (boolean)
// ============================================================
exports.me = async (req, res) => {
  // req.user viene de la estrategia JWT y ya trae two_factor_enabled.
  // Lo normalizamos a booleano por si llegó como null/undefined.
  const safeUser = {
    ...req.user,
    two_factor_enabled: !!req.user.two_factor_enabled,
  };
  return res.status(200).json({ user: safeUser });
};

// ============================================================
// 2FA — Solo admin   (sin cambios funcionales en setup/disable/verify)
// Solo aclaramos enable: el handler ya hace lo correcto, pero documentamos
// que la respuesta ahora incluye two_factor_enabled=true para que el front
// no tenga que adivinar.
// ============================================================

exports.twoFASetup = async (req, res) => {
  const { ip, user_agent } = getRequestMeta(req);
  const id_usuario = req.user.id_usuario;

  try {
    const user = await userModel.findUserById(id_usuario);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { base32, otpauth_url } = totpUtils.generateSecret(user.email);
    await userModel.setTwoFactorSecret(id_usuario, base32);

    const qrDataUrl = await totpUtils.buildQrDataUrl(otpauth_url);

    await auditLogModel.logAction({
      id_usuario, accion: '2fa_setup',
      detalle: 'Generado nuevo secret TOTP (pendiente de habilitar)',
      ip_address: ip, user_agent,
    });

    return res.status(200).json({
      message: 'Secret TOTP generado. Escanea el QR en tu app autenticadora y luego confirma con el código.',
      secret: base32,
      otpauth_url,
      qr_data_url: qrDataUrl,
    });
  } catch (err) {
    console.error('[twoFASetup]', err);
    return res.status(500).json({ error: 'Error al iniciar 2FA', message: err.message });
  }
};

exports.twoFAEnable = async (req, res) => {
  const { code } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);
  const id_usuario = req.user.id_usuario;

  if (!isNonEmptyString(code)) return res.status(400).json({ error: 'Código TOTP requerido' });

  try {
    const user = await userModel.findUserById(id_usuario);
    if (!user || !user.two_factor_secret) {
      return res.status(400).json({ error: 'Primero ejecuta /2fa/setup' });
    }

    const valid = totpUtils.verifyToken(user.two_factor_secret, code);
    if (!valid) {
      await auditLogModel.logAction({
        id_usuario, accion: '2fa_enable_fallido',
        detalle: 'Código TOTP inválido al intentar habilitar 2FA',
        ip_address: ip, user_agent,
      });
      return res.status(401).json({ error: 'Código TOTP inválido' });
    }

    await userModel.enableTwoFactor(id_usuario);
    await auditLogModel.logAction({
      id_usuario, accion: '2fa_habilitado',
      detalle: '2FA habilitado correctamente', ip_address: ip, user_agent,
    });

    // FIX bug 1: devolvemos explícitamente el nuevo estado para que el
    // frontend pueda actualizar el store sin necesidad de un refetch.
    return res.status(200).json({
      message: '2FA habilitado correctamente',
      two_factor_enabled: true,
    });
  } catch (err) {
    console.error('[twoFAEnable]', err);
    return res.status(500).json({ error: 'Error al habilitar 2FA', message: err.message });
  }
};

exports.twoFADisable = async (req, res) => {
  const { password, code } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);
  const id_usuario = req.user.id_usuario;

  if (!isNonEmptyString(password) || !isNonEmptyString(code)) {
    return res.status(400).json({ error: 'password y code son obligatorios' });
  }

  try {
    const user = await userModel.findUserById(id_usuario);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const okPwd = await comparePassword(password, user.password_hash);
    if (!okPwd) {
      await auditLogModel.logAction({
        id_usuario, accion: '2fa_disable_fallido',
        detalle: 'Password incorrecta al intentar deshabilitar 2FA',
        ip_address: ip, user_agent,
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.two_factor_secret || !totpUtils.verifyToken(user.two_factor_secret, code)) {
      await auditLogModel.logAction({
        id_usuario, accion: '2fa_disable_fallido',
        detalle: 'Código TOTP inválido al deshabilitar 2FA',
        ip_address: ip, user_agent,
      });
      return res.status(401).json({ error: 'Código TOTP inválido' });
    }

    await userModel.disableTwoFactor(id_usuario);
    await auditLogModel.logAction({
      id_usuario, accion: '2fa_deshabilitado',
      detalle: '2FA deshabilitado correctamente', ip_address: ip, user_agent,
    });

    return res.status(200).json({
      message: '2FA deshabilitado',
      two_factor_enabled: false,
    });
  } catch (err) {
    console.error('[twoFADisable]', err);
    return res.status(500).json({ error: 'Error al deshabilitar 2FA', message: err.message });
  }
};

exports.twoFAVerify = async (req, res) => {
  const { twoFAToken, code } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);

  if (!isNonEmptyString(twoFAToken) || !isNonEmptyString(code)) {
    return res.status(400).json({ error: 'twoFAToken y code son obligatorios' });
  }

  try {
    let payload;
    try {
      payload = verifyTwoFAPendingToken(twoFAToken);
    } catch {
      return res.status(401).json({ error: 'twoFAToken inválido o expirado' });
    }

    const user = await userModel.findUserWithRoleById(payload.id_usuario);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const fullUser = await userModel.findUserById(user.id_usuario);
    if (!fullUser.two_factor_enabled || !fullUser.two_factor_secret) {
      return res.status(400).json({ error: '2FA no está habilitado para este usuario' });
    }

    if (!totpUtils.verifyToken(fullUser.two_factor_secret, code)) {
      await auditLogModel.logAction({
        id_usuario: user.id_usuario, accion: '2fa_verify_fallido',
        detalle: 'Código TOTP inválido en verificación de login',
        ip_address: ip, user_agent,
      });
      return res.status(401).json({ error: 'Código TOTP inválido' });
    }

    await userModel.updateLoginInfo(user.id_usuario, ip, user_agent);

    const token = signToken({ id_usuario: user.id_usuario, id_rol: user.id_rol, rol_name: user.rol_name });

    await auditLogModel.logAction({
      id_usuario: user.id_usuario, accion: 'login_2fa_ok',
      detalle: 'Login completado con 2FA', ip_address: ip, user_agent,
    });

    return res.status(200).json({
      token,
      mustChangePassword: !!user.debe_cambiar_password,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol_name,
        two_factor_enabled: true, // ← FIX bug 1
      },
    });
  } catch (err) {
    console.error('[twoFAVerify]', err);
    return res.status(500).json({ error: 'Error al verificar 2FA', message: err.message });
  }
};
