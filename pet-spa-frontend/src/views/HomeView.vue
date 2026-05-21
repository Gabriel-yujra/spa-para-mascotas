<script setup>
import { useAuthStore } from '@/store/authStore';
import { ROLES, isAdminLike, roleLabel, hasRole } from '@/utils/roles';
import AppCard from '@/components/AppCard.vue';
import petsArt from '@/assets/illustration-pets-spa.svg';

const auth = useAuthStore();
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero__text">
        <h1>¡Hola, <span class="accent">{{ auth.user?.nombre || 'amigo' }}</span>!</h1>
        <p class="hero__sub">
          Bienvenido a <b>Pet Spa</b>. Tu rol es
          <!-- Etiqueta amigable: "Recepción", "Groomer", etc. -->
          <span class="badge" :class="`role-${auth.role}`">{{ roleLabel(auth.role) }}</span>.
        </p>
      </div>
      <img :src="petsArt" alt="Mascotas en spa" class="hero__art" />
    </section>

    <div class="grid">
      <!-- Cards for cliente role -->
      <AppCard
        v-if="auth.role === ROLES.CLIENTE"
        title="Mis mascotas"
        subtitle="Registra y gestiona tus mascotas"
        variant="soft"
      >
        <ul class="quick">
          <li><router-link to="/mis-mascotas">🐶 Ver mis mascotas</router-link></li>
        </ul>
      </AppCard>

      <AppCard
        v-if="auth.role === ROLES.CLIENTE"
        title="Citas"
        subtitle="Reserva y consulta tus citas"
        variant="soft"
      >
        <ul class="quick">
          <li><router-link to="/solicitar-cita">📅 Solicitar nueva cita</router-link></li>
          <li><router-link to="/mis-citas">📋 Ver mis citas</router-link></li>
        </ul>
      </AppCard>

      <AppCard
        title="Mi cuenta"
        subtitle="Gestiona tu acceso"
        variant="soft"
      >
        <ul class="quick">
          <li><router-link to="/change-password">🔐 Cambiar mi contraseña</router-link></li>
        </ul>
      </AppCard>

      <!-- Groomer -->
      <AppCard
        v-if="auth.role === ROLES.GROOMER"
        title="Mi agenda"
        subtitle="Citas asignadas y fichas de grooming"
        variant="soft"
      >
        <ul class="quick">
          <li><router-link to="/groomer/agenda">📅 Ver mi agenda</router-link></li>
        </ul>
      </AppCard>

      <!-- Recepción / Admin / Jefe -->
      <AppCard
        v-if="auth.role === ROLES.RECEPCION || isAdminLike(auth.role)"
        title="Recepción"
        subtitle="Gestión diaria del spa"
        variant="soft"
      >
        <ul class="quick">
          <li><router-link to="/recepcion/citas">📅 Bandeja de citas</router-link></li>
          <li><router-link to="/recepcion/clientes">👤 Clientes</router-link></li>
        </ul>
      </AppCard>

      <AppCard
        v-if="isAdminLike(auth.role)"
        title="Equipo"
        subtitle="Administra empleados"
        variant="soft"
      >
        <ul class="quick">
          <li><router-link to="/admin/empleados">👥 Gestionar empleados</router-link></li>
          <li><router-link to="/admin/auditoria">📋 Ver auditoría</router-link></li>
        </ul>
      </AppCard>

      <AppCard
        v-if="auth.role === ROLES.ADMIN"
        title="Seguridad"
        subtitle="Tu cuenta de admin"
        variant="soft"
      >
        <ul class="quick">
          <li><router-link to="/admin/seguridad">🛡️ Configurar 2FA</router-link></li>
        </ul>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.home { display: flex; flex-direction: column; gap: 1.5rem; }

.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: center;
  background: linear-gradient(135deg, #fff 0%, var(--color-primary-soft) 100%);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1.75rem;
  box-shadow: var(--shadow-md);
}
.hero h1 { margin: 0 0 0.4rem 0; font-size: 1.8rem; color: var(--color-text); }
.accent  { color: var(--color-accent); }
.hero__sub { color: var(--color-text-soft); margin: 0; }
.hero__art { width: 100%; max-width: 280px; justify-self: end; }

.role-admin       { background: #fee2e2; color: #991b1b; }
.role-jefe        { background: #fef3c7; color: #92400e; }
.role-trabajador  { background: #d1fae5; color: #065f46; }
.role-cliente     { background: var(--color-primary-soft); color: var(--color-primary-dark); }
.role-recepcion   { background: #ede9fe; color: #5b21b6; }
.role-groomer     { background: #ffe4e6; color: #9d174d; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}
.quick { list-style: none; padding: 0; margin: 0; }
.quick li { padding: 0.4rem 0; }

@media (min-width: 720px) {
  .hero { grid-template-columns: 1fr auto; }
  .hero h1 { font-size: 2.2rem; }
}
</style>
