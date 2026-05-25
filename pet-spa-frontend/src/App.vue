<script setup>
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'vue-router';
import { ROLES, isAdminLike, roleLabel } from '@/utils/roles';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <router-link :to="auth.isAuthenticated ? '/' : '/login'" class="brand">
        <span class="brand__paw" aria-hidden="true">🐾</span>
        <span class="brand__name">Pet Spa</span>
      </router-link>

      <nav class="nav">
        <template v-if="!auth.isAuthenticated">
          <router-link to="/login">Login</router-link>
          <router-link to="/register">Registro</router-link>
        </template>

        <template v-else>
          <!-- Cliente -->
          <router-link v-if="auth.role === ROLES.CLIENTE" to="/mis-mascotas">Mis mascotas</router-link>
          <router-link v-if="auth.role === ROLES.CLIENTE" to="/solicitar-cita">Solicitar cita</router-link>
          <router-link v-if="auth.role === ROLES.CLIENTE" to="/mis-citas">Mis citas</router-link>
          <router-link v-if="auth.role === ROLES.CLIENTE" to="/mi-perfil">Mi perfil</router-link>

          <!-- Groomer -->
          <router-link v-if="auth.role === ROLES.GROOMER" to="/groomer/agenda">Mi agenda</router-link>

          <!-- Recepción / Admin / Jefe -->
          <router-link
            v-if="auth.role === ROLES.RECEPCION || isAdminLike(auth.role)"
            to="/recepcion/citas"
          >Citas</router-link>
          <router-link
            v-if="auth.role === ROLES.RECEPCION || isAdminLike(auth.role)"
            to="/recepcion/clientes"
          >Clientes</router-link>
          <router-link
            v-if="auth.role === ROLES.RECEPCION || isAdminLike(auth.role)"
            to="/recepcion/bloqueos-agenda"
          >Bloqueos</router-link>

          <!-- Admin / Jefe -->
          <router-link v-if="isAdminLike(auth.role)" to="/admin/empleados">Empleados</router-link>
          <router-link v-if="isAdminLike(auth.role)" to="/admin/servicios">Servicios</router-link>
          <router-link v-if="isAdminLike(auth.role)" to="/admin/productos">Productos</router-link>
          <router-link v-if="isAdminLike(auth.role)" to="/admin/opiniones">Opiniones</router-link>
          <router-link v-if="isAdminLike(auth.role)" to="/admin/auditoria">Auditoría</router-link>
          <router-link v-if="auth.role === ROLES.ADMIN" to="/admin/seguridad">Seguridad</router-link>

          <!-- Caja: admin/jefe/recepcion -->
          <router-link
            v-if="auth.role === ROLES.RECEPCION || isAdminLike(auth.role)"
            to="/admin/caja"
          >Caja</router-link>
          <router-link to="/change-password">Cambiar contraseña</router-link>

          <span class="user-pill">
            <span class="user-pill__name">{{ auth.user?.nombre || 'Usuario' }}</span>
            <!-- Etiqueta amigable; la clase sigue usando el slug crudo para CSS -->
            <span class="badge" :class="`role-${auth.role}`">{{ roleLabel(auth.role) }}</span>
          </span>
          <button class="logout-btn" @click="logout">Salir</button>
        </template>
      </nav>
    </header>

    <main class="content">
      <router-view />
    </main>

    <footer class="footer">
      <small>🐾 Pet Spa · Hecho con cariño para mascotas felices</small>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ---------------- Topbar ---------------- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
  background: #ffffff;
  border-bottom: 3px solid var(--color-card-border);
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-primary-dark);
  text-decoration: none;
}
.brand__paw {
  display: inline-grid;
  place-items: center;
  width: 38px; height: 38px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  font-size: 1.1rem;
}
.brand__name { letter-spacing: -0.01em; }

.nav {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.nav a {
  color: var(--color-text-soft);
  font-weight: 600;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
}
.nav a.router-link-active {
  color: var(--color-primary-dark);
  background: var(--color-primary-soft);
}
.nav a:hover { background: var(--color-bg-soft); text-decoration: none; }

.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem 0.25rem 0.8rem;
  background: var(--color-bg-soft);
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--color-text);
}
.user-pill__name { font-weight: 700; }

/* Badges por rol — incluye los dos nuevos */
.role-admin       { background: #fee2e2; color: #991b1b; }
.role-jefe        { background: #fef3c7; color: #92400e; }
.role-trabajador  { background: #d1fae5; color: #065f46; }
.role-cliente     { background: var(--color-primary-soft); color: var(--color-primary-dark); }
.role-recepcion   { background: #ede9fe; color: #5b21b6; }
.role-groomer     { background: #ffe4e6; color: #9d174d; }

.logout-btn {
  background: transparent;
  border: 2px solid var(--color-card-border);
  color: var(--color-text-soft);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
}
.logout-btn:hover {
  background: #fff5f5;
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* ---------------- Content ---------------- */
.content {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.75rem 1.25rem;
}

.footer {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-soft);
}

@media (max-width: 600px) {
  .topbar { padding: 0.7rem 1rem; }
  .nav { gap: 0.4rem; font-size: 0.85rem; }
  .nav a { padding: 0.3rem 0.45rem; }
  .user-pill { display: none; }
}
</style>
