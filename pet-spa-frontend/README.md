# 🐾 Pet Spa — Frontend (Vue 3 + Vite + Pinia)

Frontend del proyecto Pet Spa. Consume la API REST del backend Node/Express en `http://localhost:3000/api` (configurable vía `.env`).

> **Frontend y backend son proyectos totalmente separados.** El frontend solo consume JSON.

---

## 📁 Estructura

```
pet-spa-frontend/
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── src/
    ├── main.js              # Bootstrap (monta Pinia + Router)
    ├── App.vue              # Layout raíz (topbar + <router-view/>)
    ├── api/
    │   ├── http.js          # Axios pre-configurado + interceptors (JWT + 401)
    │   ├── authApi.js       # login / register / changePassword / me
    │   └── employeeApi.js   # list / create / update / listRoles
    ├── store/
    │   └── authStore.js     # Pinia: token, user, role, mustChangePassword
    ├── router/
    │   └── index.js         # Rutas + guards (auth + roles + mustChangePassword)
    ├── utils/
    │   ├── roles.js         # ROLES + hasRole
    │   └── validators.js    # isValidEmail, isStrongPassword (con score 0–5)
    ├── components/          # (vacío por ahora — para piezas reutilizables)
    └── views/
        ├── HomeView.vue
        ├── Auth/
        │   ├── LoginView.vue
        │   ├── RegisterClientView.vue
        │   └── ChangePasswordView.vue
        └── Admin/
            └── EmployeesView.vue
```

---

## 🚀 Instalación

```bash
npm install
cp .env.example .env       # ajustar VITE_API_URL si tu backend no está en :3000
npm run dev                # http://localhost:5173
npm run build              # producción → dist/
```

---

## 🔐 Flujo de autenticación

1. Usuario ingresa por `/login` → `authStore.login()` llama a `POST /auth/login`.
2. El store guarda `token`, `user`, `role` en estado y en `localStorage` (`petspa_token`, `petspa_user`, `petspa_role`).
3. Si el backend devuelve `mustChangePassword: true` → redirige a `/change-password`.
4. El **interceptor de axios** inyecta `Authorization: Bearer <token>` en toda request.
5. Si el backend responde **401** → el interceptor llama `auth.logout()` y redirige a `/login`.
6. Al recargar la app, `main.js` llama a `authStore.initFromStorage()` antes de instalar el router, así los guards arrancan ya con la sesión hidratada.

## 🛡️ Rutas y guards

| Ruta                    | Auth | Roles permitidos        |
|-------------------------|------|-------------------------|
| `/login`                | ❌   | —                       |
| `/register`             | ❌   | —                       |
| `/`                     | ✅   | cualquiera autenticado  |
| `/change-password`      | ✅   | cualquiera autenticado  |
| `/admin/empleados`      | ✅   | `admin`, `jefe`         |

Reglas en el guard global (`router.beforeEach`):
1. Si la ruta tiene `meta.requiresAuth` y no hay token → `/login`.
2. Si está autenticado y `mustChangePassword === true`, se le obliga a `/change-password` (excepto si va a `/login` para hacer logout).
3. Si la ruta tiene `meta.roles`, se valida con `hasRole(auth.role, meta.roles)` → si falla, vuelve a `/`.
4. Si está autenticado e intenta ir a `/login` o `/register`, lo redirige al home.

---

## 🧪 Validaciones (alineadas con backend)

`src/utils/validators.js` aplica la **misma política** que el backend:

- Email: regex estándar.
- Contraseña: ≥ 8 chars + mayús + minús + número + símbolo.
- Devuelve `{ valid, score, errors, label }` para alimentar un medidor visual de fuerza (`Débil` / `Media` / `Fuerte`).

Las vistas de **Registro** y **Cambio de contraseña** usan ese score para mostrar una barra coloreada.

---

## 🧩 Cómo extender

- **Nuevos endpoints** → crear `src/api/<modulo>Api.js` reutilizando `http`.
- **Nuevo módulo (citas, mascotas, tienda)** → carpeta nueva en `src/views/<Modulo>/` + entrada en `router/index.js` con `meta.roles` apropiado.
- **Estado compartido** → otro store en `src/store/` (ej: `cartStore.js`, `petsStore.js`).
- **PWA** → cuando llegue el momento, agregar `vite-plugin-pwa` y registrar el service worker en `main.js`. La estructura actual no impone nada que rompa eso.

---

## ⚠️ Notas

- El interceptor de axios lee el token directamente de `localStorage` para evitar dependencia circular `authStore → http → authStore` durante el bootstrap.
- En `App.vue` hay un CSS mínimo embebido (sin Tailwind ni librería de UI) para que el proyecto arranque sin más dependencias. Se puede reemplazar por la librería de UI que prefieras.
