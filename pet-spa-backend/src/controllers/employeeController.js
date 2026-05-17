// src/controllers/employeeController.js
// PARCHE — Bug 2: el empleado se creaba con estado='inactivo', impidiendo el primer login.
// Cambio mínimo y quirúrgico: ahora se crea con estado='activo'.
// Todo lo demás (CI como password inicial, debe_cambiar_password=TRUE, correo, audit_log)
// queda exactamente igual.
const db = require('../config/db');
const userModel = require('../models/userModel');
const employeeModel = require('../models/employeeModel');
const rolesModel = require('../models/rolesModel');
const auditLogModel = require('../models/auditLogModel');

const { hashPassword, validatePasswordStrength } = require('../utils/passwordUtils');
const { isValidEmail, isNonEmptyString, isUuid } = require('../utils/validationUtils');
const { canAssignRole } = require('../utils/rolesUtils');
const mailer = require('../config/mail');

function getRequestMeta(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const user_agent = req.headers['user-agent'] || null;
  return { ip, user_agent };
}

// ========================================================
// POST /api/empleados
// ========================================================
exports.createEmployee = async (req, res) => {
  const {
    full_name,
    email,
    ci,
    role_id,
    turno,
    telefono,
    especialidad,
    sueldo_mensual,
    capacidad_simultanea,
  } = req.body || {};

  const { ip, user_agent } = getRequestMeta(req);

  if (!isNonEmptyString(full_name)) return res.status(400).json({ error: 'full_name es obligatorio' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email inválido' });
  if (!isNonEmptyString(ci)) return res.status(400).json({ error: 'ci es obligatorio (será la contraseña inicial)' });
  if (!isUuid(role_id)) return res.status(400).json({ error: 'role_id inválido' });

  if (ci.trim().length < 6) {
    return res.status(400).json({ error: 'El CI debe tener al menos 6 caracteres para usarse como contraseña inicial' });
  }

  const dbClient = await db.getClient();
  try {
    if (await userModel.emailExists(email)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const targetRole = await rolesModel.findRoleById(role_id);
    if (!targetRole) return res.status(400).json({ error: 'role_id no existe' });

    if (!canAssignRole(req.user.rol_name, targetRole.name)) {
      return res.status(403).json({
        error: `Rol '${req.user.rol_name}' no puede asignar el rol '${targetRole.name}'`,
      });
    }

    const password_hash = await hashPassword(ci.trim());

    await dbClient.query('BEGIN');

    // ============================================================
    // ⚙️  CAMBIO BUG 2:
    //   Antes: estado: 'inactivo'  → el empleado nunca podía hacer login.
    //   Ahora: estado: 'activo'    → puede entrar, pero debe_cambiar_password=true
    //                                lo encierra en /change-password hasta que la cambie.
    //   Si no la cambia dentro del plazo (EMPLOYEE_PASSWORD_GRACE_DAYS),
    //   authController.login lo desactiva automáticamente — esa lógica
    //   ya existe y se respeta sin tocarla.
    // ============================================================
    const newUser = await userModel.createUser(
      {
        id_rol: role_id,
        nombre: full_name,
        email,
        password_hash,
        debe_cambiar_password: true,
        estado: 'activo',          // ← antes era 'inactivo'
      },
      dbClient
    );

    const employee = await employeeModel.createEmployee(
      {
        id_usuario: newUser.id_usuario,
        sueldo_mensual: sueldo_mensual ?? null,
        turno: turno ?? null,
        telefono: telefono ?? null,
        especialidad: especialidad ?? null,
        capacidad_simultanea: capacidad_simultanea ?? null,
        activo: true,
      },
      dbClient
    );

    await auditLogModel.logAction(
      {
        id_usuario: req.user.id_usuario,
        accion: 'crear_empleado',
        // detalle actualizado para reflejar el nuevo flujo
        detalle: `Empleado creado: ${email} (rol=${targetRole.name}, estado=activo, debe_cambiar_password=TRUE) por ${req.user.email}`,
        ip_address: ip,
        user_agent,
      },
      dbClient
    );

    await dbClient.query('COMMIT');

    mailer
      .sendEmployeeWelcomeEmail({ nombre: newUser.nombre, email: newUser.email })
      .catch((e) => console.warn('[mail] bienvenida empleado falló:', e.message));

    return res.status(201).json({
      message: 'Empleado creado correctamente. La contraseña inicial es su CI; debe cambiarla en su primer ingreso.',
      employee: {
        id_trabajador: employee.id_trabajador,
        id_usuario: newUser.id_usuario,
        nombre: newUser.nombre,
        email: newUser.email,
        rol: targetRole.name,
        turno: employee.turno,
        especialidad: employee.especialidad,
        sueldo_mensual: employee.sueldo_mensual,
        capacidad_simultanea: employee.capacidad_simultanea,
        activo: employee.activo,
        estado_usuario: 'activo',     // ← antes era 'inactivo'
      },
    });
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    console.error('[createEmployee]', err);
    return res.status(500).json({ error: 'Error al crear empleado', message: err.message });
  } finally {
    dbClient.release();
  }
};

// ========================================================
// GET /api/empleados   — sin cambios
// ========================================================
exports.listEmployees = async (_req, res) => {
  try {
    const employees = await employeeModel.listEmployees();
    return res.status(200).json({ count: employees.length, employees });
  } catch (err) {
    console.error('[listEmployees]', err);
    return res.status(500).json({ error: 'Error al listar empleados', message: err.message });
  }
};

// ========================================================
// PATCH /api/empleados/:id   — sin cambios
// ========================================================
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { ip, user_agent } = getRequestMeta(req);

  if (!isUuid(id)) return res.status(400).json({ error: 'id de empleado inválido' });

  const {
    estado,
    activo,
    turno,
    especialidad,
    capacidad_simultanea,
    sueldo_mensual,
    telefono,
  } = req.body || {};

  const empleadoFields = {};
  if (activo !== undefined) empleadoFields.activo = activo;
  if (turno !== undefined) empleadoFields.turno = turno;
  if (especialidad !== undefined) empleadoFields.especialidad = especialidad;
  if (capacidad_simultanea !== undefined) empleadoFields.capacidad_simultanea = capacidad_simultanea;
  if (sueldo_mensual !== undefined) empleadoFields.sueldo_mensual = sueldo_mensual;
  if (telefono !== undefined) empleadoFields.telefono = telefono;

  const dbClient = await db.getClient();
  try {
    const empleado = await employeeModel.findEmployeeById(id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    await dbClient.query('BEGIN');

    let usuarioUpdated = null;
    if (estado !== undefined) {
      if (!['activo', 'inactivo', 'pendiente', 'bloqueado'].includes(estado)) {
        await dbClient.query('ROLLBACK');
        return res.status(400).json({ error: 'estado inválido' });
      }
      usuarioUpdated = await userModel.updateUserEstado(empleado.id_usuario, estado);
    }

    let empleadoUpdated = null;
    if (Object.keys(empleadoFields).length > 0) {
      empleadoUpdated = await employeeModel.updateEmployee(id, empleadoFields);
    }

    if (!usuarioUpdated && !empleadoUpdated) {
      await dbClient.query('ROLLBACK');
      return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar' });
    }

    await auditLogModel.logAction(
      {
        id_usuario: req.user.id_usuario,
        accion: 'actualizar_empleado',
        detalle: `Empleado ${id} actualizado por ${req.user.email}. Cambios: ${JSON.stringify({ estado, ...empleadoFields })}`,
        ip_address: ip,
        user_agent,
      },
      dbClient
    );

    await dbClient.query('COMMIT');

    const fresh = await employeeModel.findEmployeeById(id);
    return res.status(200).json({ message: 'Empleado actualizado', employee: fresh });
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    console.error('[updateEmployee]', err);
    return res.status(500).json({ error: 'Error al actualizar empleado', message: err.message });
  } finally {
    dbClient.release();
  }
};

exports._validatePasswordStrength = validatePasswordStrength;
