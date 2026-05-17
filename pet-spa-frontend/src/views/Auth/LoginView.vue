<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/authStore';
import { isValidEmail, isNonEmpty } from '@/utils/validators';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import AuthLayout from '@/components/AuthLayout.vue';
import petsArt from '@/assets/illustration-pets-spa.svg';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const loading = ref(false);

// Estado de error rico
const errorState = ref({
  message: '',
  type: '',     // 'invalid' | 'locked' | 'pending' | 'inactive' | 'blocked' | 'expired-staff' | 'unknown'
  lockUntil: '' // ISO string si aplica
});

function classifyError(err) {
  const status = err.response?.status;
  const data = err.response?.data || {};
  const text = (data.message || data.error || '').toLowerCase();

  if (status === 423) {
    return {
      type: 'locked',
      message: data.message || 'Tu cuenta está bloqueada temporalmente por demasiados intentos.',
      lockUntil: data.lock_until || '',
    };
  }
  if (status === 403) {
    if (text.includes('pendiente') || text.includes('activación')) {
      return { type: 'pending', message: 'Tu cuenta está pendiente de activación. Revisa tu correo.', lockUntil: '' };
    }
    if (text.includes('desactivada') || text.includes('plazo')) {
      return { type: 'expired-staff', message: data.message || 'Tu cuenta fue desactivada. Contacta al administrador.', lockUntil: '' };
    }
    if (text.includes('inactiv')) {
      return { type: 'inactive', message: 'Tu cuenta está inactiva. Contacta al administrador.', lockUntil: '' };
    }
    if (text.includes('bloque')) {
      return { type: 'blocked', message: 'Tu cuenta está bloqueada. Contacta al administrador.', lockUntil: '' };
    }
    return { type: 'inactive', message: data.message || data.error || 'Acceso denegado.', lockUntil: '' };
  }
  if (status === 401) {
    return { type: 'invalid', message: 'Email o contraseña incorrectos.', lockUntil: '' };
  }
  if (status === 400) {
    return { type: 'invalid', message: data.error || 'Datos inválidos.', lockUntil: '' };
  }
  return { type: 'unknown', message: data.error || data.message || 'Error al iniciar sesión.', lockUntil: '' };
}

function formatLockUntil(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function onSubmit() {
  errorState.value = { message: '', type: '', lockUntil: '' };

  if (!isValidEmail(email.value)) {
    errorState.value = { type: 'invalid', message: 'Ingresa un email válido', lockUntil: '' };
    return;
  }
  if (!isNonEmpty(password.value)) {
    errorState.value = { type: 'invalid', message: 'Ingresa tu contraseña', lockUntil: '' };
    return;
  }

  loading.value = true;
  try {
    const result = await auth.login(email.value, password.value);

    if (result.kind === 'requires2FA') {
      router.push('/2fa-verify');
      return;
    }

    if (result.mustChangePassword) {
      router.push('/change-password');
    } else {
      const redirect = route.query.redirect || '/';
      router.push(redirect);
    }
  } catch (err) {
    errorState.value = classifyError(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout :illustration="petsArt" illustration-alt="Mascotas felices en el spa">
    <AppCard
      title="¡Bienvenido de nuevo!"
      subtitle="Inicia sesión para gestionar tus mascotas"
    >
      <form @submit.prevent="onSubmit">
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" autocomplete="email" required />
        </div>

        <div class="field">
          <label>Contraseña</label>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </div>

        <!-- Mensajes contextuales -->
        <div v-if="errorState.message" class="alert" :class="`alert-${errorState.type}`">
          <strong v-if="errorState.type === 'locked'">🔒 Cuenta bloqueada</strong>
          <strong v-else-if="errorState.type === 'pending'">📧 Activación pendiente</strong>
          <strong v-else-if="errorState.type === 'inactive' || errorState.type === 'expired-staff' || errorState.type === 'blocked'">⚠️ Acceso denegado</strong>
          <p class="alert__msg">{{ errorState.message }}</p>
          <p v-if="errorState.lockUntil" class="alert__sub">
            Podrás reintentar después de: <b>{{ formatLockUntil(errorState.lockUntil) }}</b>
          </p>
          <p v-if="errorState.type === 'pending'" class="alert__sub">
            ¿No te llegó el correo? Revisa la carpeta de spam.
          </p>
        </div>

        <PrimaryButton type="submit" block :loading="loading" size="lg">
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </PrimaryButton>
      </form>

      <p class="footer-text">
        ¿No tienes cuenta?
        <router-link to="/register">Regístrate como cliente</router-link>
      </p>
    </AppCard>
  </AuthLayout>
</template>

<style scoped>
.footer-text {
  margin-top: 1.25rem;
  font-size: 0.9rem;
  color: var(--color-text-soft);
  text-align: center;
}

.alert {
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
.alert strong { display: block; margin-bottom: 0.2rem; }
.alert__msg { margin: 0; }
.alert__sub { margin: 0.3rem 0 0 0; font-size: 0.82rem; }

.alert-invalid { background: #fee2e2; color: #991b1b; }
.alert-locked  { background: #fef3c7; color: #92400e; }
.alert-pending { background: var(--color-primary-soft); color: var(--color-primary-dark); }
.alert-inactive,
.alert-blocked,
.alert-expired-staff { background: #fee2e2; color: #991b1b; }
.alert-unknown { background: #fee2e2; color: #991b1b; }
</style>
