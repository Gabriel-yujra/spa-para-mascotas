// src/config/mail.js
// REEMPLAZO. Añade plantillas: activación con token, bienvenida empleado con CI, alerta de bloqueo.
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '2525', 10),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.warn('⚠️  Mail transporter no verificado:', err.message);
  else console.log('✉️  Mail transporter listo');
});

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'Pet Spa <no-reply@petspa.com>',
    to,
    subject,
    text,
    html,
  });
}

/**
 * Correo de activación con token (válido por 15 min).
 */
async function sendActivationEmail(user, activationToken) {
  const url = `${process.env.FRONTEND_URL}/activate?token=${encodeURIComponent(activationToken)}`;
  const minutes = process.env.ACTIVATION_TOKEN_MINUTES || '15';
  const html = `
    <h2>¡Bienvenido a Pet Spa, ${user.nombre}! 🐾</h2>
    <p>Para activar tu cuenta, haz clic en el siguiente enlace:</p>
    <p><a href="${url}">Activar mi cuenta</a></p>
    <p><b>Este enlace expira en ${minutes} minutos.</b></p>
    <p>Si no creaste esta cuenta, ignora este correo.</p>
  `;
  return sendMail({
    to: user.email,
    subject: 'Activa tu cuenta Pet Spa',
    html,
    text: `Bienvenido ${user.nombre}. Activa tu cuenta (vence en ${minutes} min): ${url}`,
  });
}

/**
 * Correo de bienvenida para EMPLEADO recién creado.
 * IMPORTANTE: La política nueva indica que la contraseña inicial = CI del empleado.
 * Por seguridad, no incluimos la contraseña en el cuerpo: solo describimos la regla.
 */
async function sendEmployeeWelcomeEmail(user) {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  const grace = process.env.EMPLOYEE_PASSWORD_GRACE_DAYS || '7';
  const html = `
    <h2>¡Bienvenido al equipo de Pet Spa, ${user.nombre}! 🐾</h2>
    <p>Has sido registrado como parte del equipo. Para ingresar:</p>
    <ol>
      <li>Ve a <a href="${loginUrl}">${loginUrl}</a></li>
      <li>Inicia sesión con tu correo: <b>${user.email}</b></li>
      <li>Tu <b>contraseña inicial es tu número de CI</b> (sin espacios, tal como fue registrada por el administrador).</li>
      <li>El sistema te pedirá cambiarla inmediatamente.</li>
    </ol>
    <p><b>Importante:</b> tienes <b>${grace} días</b> para iniciar sesión y cambiar tu contraseña.
    Pasado ese plazo, tu cuenta será desactivada y deberás contactar al administrador.</p>
  `;
  return sendMail({
    to: user.email,
    subject: 'Tu cuenta Pet Spa ha sido creada',
    html,
    text: `Bienvenido ${user.nombre}. Tu contraseña inicial es tu CI. Cambiala en tu primer ingreso (${loginUrl}). Tienes ${grace} días.`,
  });
}

/**
 * Notificación al usuario tras quedar bloqueado por intentos fallidos.
 */
async function sendAccountLockedEmail(user, lockUntil) {
  const html = `
    <h2>Alerta de seguridad — Pet Spa</h2>
    <p>Hola ${user.nombre},</p>
    <p>Tu cuenta fue bloqueada temporalmente por demasiados intentos de login fallidos.
    Podrás volver a intentarlo a partir de: <b>${new Date(lockUntil).toLocaleString()}</b>.</p>
    <p>Si no fuiste tú, contacta al administrador.</p>
  `;
  return sendMail({
    to: user.email,
    subject: 'Tu cuenta Pet Spa fue bloqueada temporalmente',
    html,
    text: `Tu cuenta fue bloqueada hasta ${new Date(lockUntil).toISOString()} por intentos fallidos.`,
  });
}

module.exports = {
  transporter,
  sendMail,
  sendActivationEmail,
  sendEmployeeWelcomeEmail,
  sendAccountLockedEmail,
};
