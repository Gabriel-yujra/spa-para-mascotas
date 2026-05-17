// src/controllers/userController.js
// REEMPLAZO. Añade changeUserEstado para "borrado lógico".
const rolesModel = require('../models/rolesModel');
const userModel = require('../models/userModel');
const auditLogModel = require('../models/auditLogModel');
const { isUuid } = require('../utils/validationUtils');

const VALID_ESTADOS = ['pendiente', 'activo', 'inactivo', 'bloqueado'];

function getRequestMeta(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const user_agent = req.headers['user-agent'] || null;
  return { ip, user_agent };
}

// GET /api/usuarios/me
exports.getMyProfile = async (req, res) => {
  try {
    const user = await userModel.findUserWithRoleById(req.user.id_usuario);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(200).json({ user });
  } catch (err) {
    console.error('[getMyProfile]', err);
    return res.status(500).json({ error: 'Error al obtener perfil', message: err.message });
  }
};

// GET /api/usuarios/roles
exports.listRoles = async (_req, res) => {
  try {
    const roles = await rolesModel.listRoles();
    return res.status(200).json({ roles });
  } catch (err) {
    console.error('[listRoles]', err);
    return res.status(500).json({ error: 'Error al listar roles', message: err.message });
  }
};

// PATCH /api/usuarios/:id/estado
// Body: { estado: 'pendiente'|'activo'|'inactivo'|'bloqueado' }
// Cambio de estado = borrado lógico / reactivación.
exports.changeUserEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body || {};
  const { ip, user_agent } = getRequestMeta(req);

  if (!isUuid(id)) return res.status(400).json({ error: 'id inválido' });
  if (!VALID_ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `estado inválido. Valores: ${VALID_ESTADOS.join(', ')}` });
  }

  // Evitar que un admin se desactive a sí mismo accidentalmente
  if (id === req.user.id_usuario && estado !== 'activo') {
    return res.status(400).json({ error: 'No puedes cambiar tu propio estado a un valor distinto de activo' });
  }

  try {
    const updated = await userModel.updateUserEstado(id, estado);
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });

    await auditLogModel.logAction({
      id_usuario: req.user.id_usuario,
      accion: 'cambio_estado_usuario',
      detalle: `Estado del usuario ${id} cambiado a '${estado}' por ${req.user.email}`,
      ip_address: ip,
      user_agent,
    });

    return res.status(200).json({ message: 'Estado actualizado', user: updated });
  } catch (err) {
    console.error('[changeUserEstado]', err);
    return res.status(500).json({ error: 'Error al cambiar estado', message: err.message });
  }
};
