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

/**
 * Alerta de stock bajo enviada al correo de administración.
 * productos: [{ nombre, categoria, stock_unidades, stock_minimo, unidad_presentacion }]
 */
async function sendAlertaStockBajo(productos) {
  if (!productos || productos.length === 0) return;

  function nivelAlerta(p) {
    if (Number(p.stock_unidades) === 0)                          return { label: 'CRÍTICO',  color: '#dc2626' };
    if (Number(p.stock_unidades) <= Number(p.stock_minimo) * 0.5) return { label: 'MUY BAJO', color: '#ea580c' };
    return                                                              { label: 'BAJO',      color: '#ca8a04' };
  }

  const filas = productos.map((p) => {
    const { label, color } = nivelAlerta(p);
    const unidad = p.unidad_presentacion ? ` ${p.unidad_presentacion}` : '';
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${p.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">${p.categoria || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700">${p.stock_unidades}${unidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280">${p.stock_minimo}${unidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
          <span style="background:${color};color:#fff;padding:2px 8px;border-radius:999px;font-size:0.75rem;font-weight:700">${label}</span>
        </td>
      </tr>`;
  }).join('');

  const html = `
    <h2 style="color:#991b1b">⚠️ Alerta de stock bajo — Pet Spa</h2>
    <p>Los siguientes <b>${productos.length}</b> producto(s) tienen stock igual o por debajo del mínimo configurado:</p>
    <table style="border-collapse:collapse;width:100%;max-width:680px;font-family:sans-serif;font-size:0.9rem">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:8px 12px;text-align:left">Producto</th>
          <th style="padding:8px 12px;text-align:left">Categoría</th>
          <th style="padding:8px 12px;text-align:center">Stock actual</th>
          <th style="padding:8px 12px;text-align:center">Mínimo</th>
          <th style="padding:8px 12px;text-align:center">Nivel</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <p style="margin-top:1.2em;color:#6b7280;font-size:0.85em">
      Revisa el módulo de <b>Productos</b> en el panel de administración para reponer el inventario.
    </p>
  `;

  const textoPlano = productos.map((p) => {
    const { label } = nivelAlerta(p);
    return `- ${p.nombre}: ${p.stock_unidades} / mínimo ${p.stock_minimo} [${label}]`;
  }).join('\n');

  const adminTo = process.env.ADMIN_ALERT_EMAIL || process.env.MAIL_FROM || 'admin@petspa.com';

  return sendMail({
    to: adminTo,
    subject: `Alerta de stock bajo – Pet Spa (${productos.length} producto${productos.length > 1 ? 's' : ''})`,
    html,
    text: `Alerta de stock bajo en Pet Spa:\n\n${textoPlano}\n\nRevisa el panel de administración.`,
  });
}

/**
 * Notificación al cliente cuando su mascota está lista para recoger.
 */
async function sendListoParaRecoger({ clienteEmail, clienteNombre, mascotaNombre, servicioNombre, observaciones, recomendaciones }) {
  const obs  = observaciones  || 'Sin observaciones adicionales.';
  const rec  = recomendaciones || 'Sin recomendaciones adicionales.';
  const html = `
    <h2>🐾 ¡${mascotaNombre} está lista para recoger!</h2>
    <p>Hola ${clienteNombre},</p>
    <p>El servicio <b>${servicioNombre}</b> ha finalizado correctamente.</p>
    <table cellpadding="8" style="border-collapse:collapse;width:100%;max-width:480px">
      <tr>
        <td style="font-weight:bold;color:#555;width:160px">Observaciones</td>
        <td>${obs}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="font-weight:bold;color:#555">Recomendaciones</td>
        <td>${rec}</td>
      </tr>
    </table>
    <p style="margin-top:1.2em">Puedes pasar a recoger a <b>${mascotaNombre}</b> cuando gustes. 🐶</p>
    <p style="color:#888;font-size:0.85em">Pet Spa — gracias por confiar en nosotros.</p>
  `;
  return sendMail({
    to: clienteEmail,
    subject: `Tu mascota ${mascotaNombre} está lista para recoger — Pet Spa`,
    html,
    text: `Hola ${clienteNombre}, el servicio ${servicioNombre} para ${mascotaNombre} ha finalizado.\nObservaciones: ${obs}\nRecomendaciones: ${rec}\nPuedes pasar a recoger a tu mascota.`,
  });
}

module.exports = {
  transporter,
  sendMail,
  sendActivationEmail,
  sendEmployeeWelcomeEmail,
  sendAccountLockedEmail,
  sendAlertaStockBajo,
  sendListoParaRecoger,
};
