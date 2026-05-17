# Pet Spa – Sistema de Gestión para Spa de Mascotas

Proyecto académico para la gestión de un Spa para mascotas, dividido en backend (API REST) y frontend (SPA en Vue 3).  
El objetivo principal es implementar un módulo de autenticación y gestión de usuarios con buenas prácticas de seguridad (RBAC, JWT, 2FA, bloqueo por intentos, auditoría), además de la gestión básica de empleados y clientes.

## Estructura del repositorio

```text
spa-para-mascotas/
├── README.md
├── backend/      # API REST (Node.js + Express + PostgreSQL)
└── frontend/     # Aplicación web (Vue 3 + Vite + Pinia + vue-router)
```

---

## Backend (`backend/`)

### Tecnologías

- Node.js / Express
- PostgreSQL
- JWT para autenticación
- Bcrypt para hashing de contraseñas
- Nodemailer (Mailtrap) para envío de correos
- Passport (estrategia JWT)
- Arquitectura por capas: `config/`, `models/`, `controllers/`, `routes/`, `middlewares/`, `utils/`

### Funcionalidades principales

- Autenticación con JWT (login, logout lógico).
- Registro de clientes con auto‑registro.
- Registro de personal (empleados: admin, jefe, recepción, groomer) solo por administrador.
- Política de contraseñas seguras:
  - Mínimo 8 caracteres.
  - Mayúsculas, minúsculas, números y símbolos.
- Medidor visual de fuerza (en el frontend) + validación fuerte en backend.
- Envío de correos:
  - Correo de activación de cuenta para clientes con token firmado y expiración (15 min).
  - Correo de bienvenida a nuevos empleados indicando que deben cambiar su contraseña.
- 2FA (Two-Factor Authentication) para administrador con TOTP (app tipo Google Authenticator).
- Bloqueo preventivo:
  - Tras 5 intentos fallidos de login, la cuenta se bloquea temporalmente.
- Gestión de estados de usuario:
  - `pendiente`, `activo`, `inactivo`, bloqueo temporal.
  - Borrado lógico: los usuarios no se eliminan físicamente, solo se desactivan.
- Gestión de empleados (admin/jefe):
  - Alta de empleados con rol (`ADMIN`, `JEFE`, `RECEPCION`, `GROOMER`).
  - Obligación de cambiar contraseña en el primer login.
- Auditoría (`audit_log`):
  - Registro de eventos importantes (login, fallos, registros, cambios de contraseña, activaciones, bloqueos).
  - Cada registro incluye:
    - Quién (usuario y rol).
    - Cuándo (fecha/hora).
    - Desde dónde (IP y user agent).
    - Qué hizo (acción y detalle).

### Requerimientos

- Node.js 18+
- PostgreSQL (ej. 16.x)
- Cuenta de Mailtrap (para pruebas de correo)

### Configuración

1. Crear la base de datos (en PostgreSQL):

   ```sql
   CREATE DATABASE pet_spa;
   ```

2. Ejecutar el script SQL de esquema (por ejemplo `db/schema.sql`) sobre la BD `pet_spa`.

3. Copiar `.env.example` a `.env` en la carpeta `backend/` y completar:

   - Parámetros de conexión a PostgreSQL.
   - JWT_SECRET, expiración.
   - Credenciales de Mailtrap (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM).
   - FRONTEND_URL (para enlaces de activación).

4. Instalar dependencias y arrancar:

   ```bash
   cd backend
   npm install
   npm run dev       # o node server.js
   ```

---

## Frontend (`frontend/`)

### Tecnologías

- Vue 3 con `<script setup>`
- Vite
- Pinia (store global de autenticación)
- vue-router (rutas protegidas y guards por rol)
- Axios (capa API en `src/api/`)

### Funcionalidades principales

- Pantallas de:
  - Login.
  - Registro de clientes.
  - Activación de cuenta (link desde correo).
  - Cambio de contraseña.
  - Dashboard de bienvenida.
  - Gestión de empleados (admin/jefe).
  - Auditoría de acciones (solo admin/jefe).
  - Configuración de seguridad 2FA (solo admin).
- Manejo de JWT con `authStore`:
  - Información de usuario autenticado.
  - Rol (`ADMIN`, `JEFE`, `RECEPCION`, `GROOMER`, `CLIENTE`).
  - Flag `mustChangePassword` para forzar cambio de contraseña.
- Guards de rutas:
  - Rutas que requieren estar autenticado.
  - Rutas restringidas por rol (RBAC).
  - Middleware para redirigir a “Cambiar contraseña” si `mustChangePassword = true`.
- Medidor visual de fuerza de contraseña en formularios de registro y cambio de contraseña.
- Integración con backend para:
  - Activación de cuenta.
  - 2FA (paso adicional de verificación para admin).
  - Auditoría (mostrar `audit_log` con filtros y exportación simple).
- Diseño visual:
  - Tema amigable “cartoon” orientado a mascotas (Paleta cálida, cards redondeadas, ilustraciones de perros/gatos).

### Configuración

1. Copiar `.env.example` a `.env` en `frontend/` y configurar:

   - URL del backend (`VITE_API_URL` o similar).

2. Instalar dependencias y arrancar:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Abrir el navegador en la URL que indique Vite (por defecto `http://localhost:5173`).

---

## Cómo correr todo junto (desarrollo local)

1. Arrancar PostgreSQL y asegurar que la BD `pet_spa` está creada y con el esquema cargado.
2. Arrancar el backend:

   ```bash
   cd backend
   npm run dev
   ```

3. Arrancar el frontend en otra terminal:

   ```bash
   cd frontend
   npm run dev
   ```

4. Navegar al frontend (ej. `http://localhost:5173`) e iniciar las pruebas:
   - Registro y activación de clientes.
   - Login por roles.
   - Gestión de empleados.
   - 2FA admin.
   - Auditoría de acciones.

---

## Notas sobre el desarrollo

- El repositorio se actualiza con ramas de feature (`feat/…`) para evidenciar el proceso:
  - `feat/activacion-cuenta`
  - `feat/2fa-admin`
  - `feat/auditoria-logs`
  - `feat/ui-cartoon-petspa`
  - etc.
- La base de datos no se sube; solo los scripts de esquema y configuración.
- Los archivos `.env` también están excluidos del repositorio por seguridad.