// src/router/index.js
// REEMPLAZO. Añade rutas y guard de mustChangePassword endurecido.
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/store/authStore';
import { ROLES, hasRole } from '@/utils/roles';

import LoginView from '@/views/Auth/LoginView.vue';
import RegisterClientView from '@/views/Auth/RegisterClientView.vue';
import ChangePasswordView from '@/views/Auth/ChangePasswordView.vue';
import ActivateAccountView from '@/views/Auth/ActivateAccountView.vue';
import TwoFAVerifyView from '@/views/Auth/TwoFAVerifyView.vue';

import EmployeesView from '@/views/Admin/EmployeesView.vue';
import AdminSecurityView from '@/views/Admin/AdminSecurityView.vue';
import AuditLogView from '@/views/Admin/AuditLogView.vue';
import AdminServiciosView from '@/views/Admin/AdminServiciosView.vue';
import AdminCajaView from '@/views/Admin/AdminCajaView.vue';
import AdminPagosEmpleadosView from '@/views/Admin/AdminPagosEmpleadosView.vue';
import AdminProductosView from '@/views/Admin/AdminProductosView.vue';
import AdminOpinionesView from '@/views/Admin/AdminOpinionesView.vue';
import AdminReportesView  from '@/views/Admin/AdminReportesView.vue';

import ClienteTiendaView  from '@/views/Cliente/ClienteTiendaView.vue';

import HomeView from '@/views/HomeView.vue';

import MisMascotasView    from '@/views/Cliente/MisMascotasView.vue';
import MisCitasView       from '@/views/Cliente/MisCitasView.vue';
import SolicitarCitaView  from '@/views/Cliente/SolicitarCitaView.vue';
import ClientePerfilView  from '@/views/Cliente/ClientePerfilView.vue';

import RecepcionCitasView          from '@/views/Recepcion/RecepcionCitasView.vue';
import RecepcionClientesView       from '@/views/Recepcion/RecepcionClientesView.vue';
import RecepcionClienteDetalleView from '@/views/Recepcion/RecepcionClienteDetalleView.vue';

import GroomerAgendaView from '@/views/Groomer/GroomerAgendaView.vue';
import GroomerFichaView  from '@/views/Groomer/GroomerFichaView.vue';

import RecepcionFichaGroomingView    from '@/views/Recepcion/RecepcionFichaGroomingView.vue';
import RecepcionBloqueosAgendaView  from '@/views/Recepcion/RecepcionBloqueosAgendaView.vue';
import ClienteFichaGroomingView     from '@/views/Cliente/ClienteFichaGroomingView.vue';

const routes = [
  // Públicas
  { path: '/login',     name: 'login',     component: LoginView,           meta: { public: true } },
  { path: '/register',  name: 'register',  component: RegisterClientView,  meta: { public: true } },
  { path: '/activate',  name: 'activate',  component: ActivateAccountView, meta: { public: true } },
  { path: '/2fa-verify',name: '2fa-verify',component: TwoFAVerifyView,     meta: { public: true, requires2FA: true } },

  // Sesión iniciada
  { path: '/',                 name: 'home',            component: HomeView,           meta: { requiresAuth: true } },
  { path: '/change-password',  name: 'change-password', component: ChangePasswordView, meta: { requiresAuth: true } },

  // Cliente
  {
    path: '/mi-perfil',
    name: 'mi-perfil',
    component: ClientePerfilView,
    meta: { requiresAuth: true, roles: [ROLES.CLIENTE] },
  },
  {
    path: '/mis-citas/:idCita/ficha',
    name: 'cliente-ficha-grooming',
    component: ClienteFichaGroomingView,
    meta: { requiresAuth: true, roles: [ROLES.CLIENTE] },
  },
  {
    path: '/mis-mascotas',
    name: 'mis-mascotas',
    component: MisMascotasView,
    meta: { requiresAuth: true, roles: [ROLES.CLIENTE] },
  },
  {
    path: '/mis-citas',
    name: 'mis-citas',
    component: MisCitasView,
    meta: { requiresAuth: true, roles: [ROLES.CLIENTE] },
  },
  {
    path: '/solicitar-cita',
    name: 'solicitar-cita',
    component: SolicitarCitaView,
    meta: { requiresAuth: true, roles: [ROLES.CLIENTE] },
  },
  {
    path: '/tienda',
    name: 'tienda',
    component: ClienteTiendaView,
    meta: { requiresAuth: true, roles: [ROLES.CLIENTE] },
  },

  // Admin / Jefe
  {
    path: '/admin/empleados',
    name: 'admin-empleados',
    component: EmployeesView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE] },
  },
  {
    path: '/admin/auditoria',
    name: 'admin-auditoria',
    component: AuditLogView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE] },
  },

  // Admin (2FA propio)
  {
    path: '/admin/seguridad',
    name: 'admin-seguridad',
    component: AdminSecurityView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN] },
  },

  // Admin / Jefe: módulos de gestión
  {
    path: '/admin/servicios',
    name: 'admin-servicios',
    component: AdminServiciosView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE] },
  },
  {
    path: '/admin/caja',
    name: 'admin-caja',
    component: AdminCajaView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION] },
  },
  {
    path: '/admin/pagos-empleados',
    name: 'admin-pagos-empleados',
    component: AdminPagosEmpleadosView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE] },
  },
  {
    path: '/admin/productos',
    name: 'admin-productos',
    component: AdminProductosView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE] },
  },
  {
    path: '/admin/opiniones',
    name: 'admin-opiniones',
    component: AdminOpinionesView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE] },
  },
  {
    path: '/admin/reportes',
    name: 'admin-reportes',
    component: AdminReportesView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE] },
  },

  // Recepción / Admin / Jefe
  {
    path: '/recepcion/citas',
    name: 'recepcion-citas',
    component: RecepcionCitasView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION] },
  },
  {
    path: '/recepcion/clientes',
    name: 'recepcion-clientes',
    component: RecepcionClientesView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION] },
  },
  {
    path: '/recepcion/clientes/:id',
    name: 'recepcion-cliente-detalle',
    component: RecepcionClienteDetalleView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION] },
  },

  // Recepción: ficha de grooming (solo lectura)
  {
    path: '/recepcion/citas/:idCita/ficha',
    name: 'recepcion-ficha-grooming',
    component: RecepcionFichaGroomingView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION] },
  },

  // Recepción / Admin / Jefe: gestión de bloqueos de agenda
  {
    path: '/recepcion/bloqueos-agenda',
    name: 'recepcion-bloqueos-agenda',
    component: RecepcionBloqueosAgendaView,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN, ROLES.JEFE, ROLES.RECEPCION] },
  },

  // Groomer
  {
    path: '/groomer/agenda',
    name: 'groomer-agenda',
    component: GroomerAgendaView,
    meta: { requiresAuth: true, roles: [ROLES.GROOMER] },
  },
  {
    path: '/groomer/citas/:idCita/ficha',
    name: 'groomer-ficha',
    component: GroomerFichaView,
    meta: { requiresAuth: true, roles: [ROLES.GROOMER] },
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// =================== Guards ===================
router.beforeEach((to) => {
  const auth = useAuthStore();

  // 1. Si la ruta es /2fa-verify, requiere tener un token pendiente.
  if (to.meta.requires2FA) {
    if (!auth.isPending2FA) return { name: 'login' };
    return true;
  }

  // 2. Si NO hay token y la ruta requiere auth -> /login
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 3. Si está autenticado y debe cambiar password, encerrar en /change-password.
  //    Permitido salir solo a /login (logout) o quedarse en change-password.
  if (
    auth.isAuthenticated &&
    auth.mustChangePassword &&
    to.name !== 'change-password' &&
    to.name !== 'login'
  ) {
    return { name: 'change-password' };
  }

  // 4. Roles
  if (to.meta.roles && to.meta.roles.length > 0) {
    if (!hasRole(auth.role, to.meta.roles)) {
      return { name: 'home' };
    }
  }

  // 5. Si está logueado y va a una pública (login/register/activate), mandar al home.
  //    Excepción: /activate sí debe abrirse incluso logueado para procesar el token.
  if (to.meta.public && auth.isAuthenticated && to.name !== 'activate') {
    return { name: 'home' };
  }

  return true;
});

export default router;
