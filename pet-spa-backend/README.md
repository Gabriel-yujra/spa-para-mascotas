# 🐾 Pet Spa Backend — Módulo de Autenticación y Gestión de Usuarios (RBAC)

Backend Node.js + Express + PostgreSQL para el proyecto **Pet Spa** (spa para mascotas + tienda de accesorios). Este repositorio implementa el **primer módulo**: autenticación, gestión de usuarios y RBAC (Role-Based Access Control).

---

## 📁 Estructura de carpetas

```
pet-spa-backend/
├── server.js                          # Punto de entrada (Express)
├── package.json
├── .env.example
├── .gitignore
├── uploads/                           # Archivos estáticos
└── src/
    ├── config/
    │   ├── db.js                      # Pool de PostgreSQL
    │   ├── passport.js                # Estrategia JWT
    │   └── mail.js                    # Nodemailer
    ├── middlewares/
    │   ├── authRequired.js            # Verifica JWT
    │   ├── requireRole.js             # Verifica rol permitido
    │   └── mustNotForcePasswordChange.js
    ├── models/                        # Solo SQL, sin Express
    │   ├── userModel.js
    │   ├── clientModel.js
    │   ├── employeeModel.js
    │   ├── rolesModel.js
    │   └── auditLogModel.js
    ├── controllers/                   # Lógica HTTP
    │   ├── authController.js
    │   ├── employeeController.js
    │   └── userController.js
    ├── routes/                        # Endpoints
    │   ├── authRoutes.js
    │   ├── employeeRoutes.js
    │   └── usersRoutes.js
    └── utils/
        ├── passwordUtils.js           # bcrypt + política de seguridad
        ├── jwtUtils.js                # firma/verificación JWT
        ├── rolesUtils.js              # ROLES + hasRole + canAssignRole
        └── validationUtils.js         # email, uuid, etc.
```

---

## 🚀 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# editar .env con tus credenciales reales (DB, JWT_SECRET, SMTP)

# 3. Levantar
npm run dev    # con nodemon
# o
npm start
```

Asegúrate de que la BD `pet_spa` exista y tenga las tablas `roles`, `usuarios`, `clientes`, `trabajadores` y `audit_log`. La tabla `roles` debe tener al menos: `cliente`, `trabajador`, `admin`, `jefe`.

```sql
INSERT INTO roles (name, description) VALUES
  ('cliente',    'Dueño de mascota'),
  ('trabajador', 'Empleado del spa'),
  ('admin',      'Administrador del sistema'),
  ('jefe',       'Dueño / gerente general');
```

---

## 🔐 Endpoints disponibles

| Método | Endpoint                       | Auth        | Rol requerido         | Descripción                          |
|--------|--------------------------------|-------------|-----------------------|--------------------------------------|
| POST   | `/api/auth/register`           | público     | —                     | Registro de cliente                  |
| POST   | `/api/auth/login`              | público     | —                     | Login (devuelve JWT)                 |
| POST   | `/api/auth/change-password`    | JWT         | cualquiera autenticado| Cambia contraseña                    |
| GET    | `/api/auth/me`                 | JWT         | cualquiera autenticado| Datos del usuario logueado           |
| GET    | `/api/usuarios/me`             | JWT         | cualquiera autenticado| Perfil completo                      |
| GET    | `/api/usuarios/roles`          | JWT         | admin / jefe          | Lista los roles del sistema          |
| POST   | `/api/empleados`               | JWT         | admin / jefe          | Crear empleado                       |
| GET    | `/api/empleados`               | JWT         | admin / jefe          | Listar empleados                     |
| PATCH  | `/api/empleados/:id`           | JWT         | admin / jefe          | Actualizar empleado                  |
| GET    | `/api/health`                  | público     | —                     | Healthcheck                          |

### Ejemplo de payload — registro de cliente

```json
POST /api/auth/register
{
  "nombre": "Ana Pérez",
  "email": "ana@gmail.com",
  "password": "SuperSeguro123!",
  "telefono": "70000000",
  "ci": "1234567 LP",
  "direccion": "Av. Arce 123, La Paz",
  "canal_notificacion": "whatsapp",
  "horarios_preferidos": "tardes"
}
```

### Ejemplo de payload — crear empleado

```json
POST /api/empleados
Authorization: Bearer <jwt-de-admin-o-jefe>
{
  "full_name": "Mario Bross",
  "email": "mario@gmail.com",
  "password": "InicialSegura1!",
  "role_id": "uuid-del-rol-trabajador",
  "turno": "mañana",
  "telefono": "777-0000",
  "especialidad": "Corte fino",
  "sueldo_mensual": 3500,
  "capacidad_simultanea": 2
}
```

---

## 🛡️ Seguridad implementada

- ✅ **Bcrypt** (cost configurable, default 12) para hashear contraseñas.
- ✅ **Política de contraseñas**: ≥8 chars + mayús + minús + número + símbolo.
- ✅ **JWT** con secret en `.env` y expiración configurable.
- ✅ **Passport-JWT** validando token en cada ruta protegida.
- ✅ **RBAC** con `requireRole([ROLES.X])` y `canAssignRole()` (un admin no puede crear un jefe).
- ✅ **`debe_cambiar_password`** se fuerza para empleados nuevos; bloqueamos endpoints sensibles hasta que cambien la inicial.
- ✅ **Email único** (constraint + chequeo previo).
- ✅ **Auditoría** en `audit_log` para: `registro_cliente`, `login`, `login_fallido`, `cambio_password`, `cambio_password_fallido`, `crear_empleado`, `actualizar_empleado`.
- ✅ **IP + User-Agent** capturados en login y en todos los logs.
- ✅ **Transacciones** (`BEGIN/COMMIT/ROLLBACK`) en operaciones que tocan varias tablas (registro, creación de empleado, update de empleado).
- ✅ **Nodemailer** listo para enviar contraseñas temporales y correos de activación.
- 🟡 **2FA**: las columnas `two_factor_enabled` / `two_factor_secret` ya se leen en login; queda como TODO el flujo de TOTP completo (recomendado: `speakeasy` + `qrcode`).

---

## 🧩 Cómo extender este módulo a otros componentes del sistema

Esta base está diseñada para ser la **columna vertebral** del resto del proyecto. Para los siguientes módulos del Pet Spa simplemente reutilizá lo que ya existe:

### 1. Módulo de **citas / grooming**
- Crear `src/models/citasModel.js`, `src/controllers/citasController.js`, `src/routes/citasRoutes.js`.
- Proteger los endpoints con `authRequired` + `requireRole([ROLES.CLIENTE])` para crear su propia cita, y `requireRole([ROLES.EMPLEADO, ROLES.ADMIN, ROLES.JEFE])` para gestionarlas.
- En el modelo de citas, la FK `id_cliente` o `id_trabajador` viene de `req.user.id_usuario` → buscar el `id_cliente` correspondiente.
- Registrar acciones (`crear_cita`, `cancelar_cita`, etc.) en `audit_log` reutilizando `auditLogModel.logAction`.

### 2. Módulo de **caja / pagos**
- Solo accesible por `ROLES.ADMIN` y `ROLES.JEFE` (y eventualmente cajeros como `ROLES.EMPLEADO` con sub-permisos).
- Toda transacción se loguea en `audit_log` con la acción `registrar_pago`, `anular_pago`, etc.

### 3. Módulo de **tienda / accesorios**
- Endpoints públicos de catálogo (sin `authRequired`).
- Endpoints de gestión protegidos con `requireRole([ROLES.ADMIN, ROLES.JEFE])`.
- Para órdenes de compra, asociar al `id_usuario` autenticado (cliente).

### 4. Módulo de **mascotas**
- `src/models/petModel.js` con FK a `id_cliente`.
- Endpoint `GET /api/mascotas/mis-mascotas` que filtra por el cliente del `req.user`.

### 5. Patrones reutilizables
- **`hasRole` / `canAssignRole`** ya cubren cualquier validación de permisos.
- **`getRequestMeta(req)`** (helper en cada controller) → extraer en `src/utils/requestUtils.js` si quieres DRY.
- **Transacciones** → siempre usar `db.getClient()` + `BEGIN/COMMIT/ROLLBACK` cuando una operación toca >1 tabla.
- **`mustNotForcePasswordChange`** se puede aplicar a cualquier ruta nueva, no solo a empleados.

### 6. Sugerencias futuras
- **Refresh tokens**: agregar tabla `refresh_tokens` + endpoint `/api/auth/refresh`.
- **Rate limiting**: `express-rate-limit` en `/api/auth/login` para mitigar brute-force.
- **Helmet**: agregar `helmet()` en `server.js`.
- **Validación con Joi/Zod**: reemplazar las validaciones manuales por un schema validator.
- **Logger estructurado**: integrar `winston` (ya está en dependencias) y reemplazar los `console.log`.
- **Tests**: Jest + supertest para los endpoints críticos (login, register, crear empleado).

---

## 📝 Notas finales

- Las consultas siempre usan **SQL parametrizado** (`$1, $2, ...`) → inmune a SQL injection.
- Los models **nunca** importan Express; los controllers **nunca** importan `pg` directamente. Esa separación se mantiene en todo el módulo y debe respetarse en los siguientes.
- El campo `audit_log.detalle` es libre (TEXT). Usalo para guardar contexto humano-legible; si necesitas estructura, pasalo a JSON serializado.
