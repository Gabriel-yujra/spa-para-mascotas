<script setup>
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/authStore';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import AuthLayout from '@/components/AuthLayout.vue';
import mailArt from '@/assets/illustration-mail.svg';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

// estados: 'loading' | 'success' | 'error' | 'no-token'
const status = ref('loading');
const errorMsg = ref('');

async function tryActivate(token) {
  if (!token) {
    status.value = 'no-token';
    errorMsg.value = 'No se encontró un token en la URL.';
    return;
  }
  try {
    await auth.activateAccount(token);
    status.value = 'success';
    setTimeout(() => router.push('/'), 1500);
  } catch (err) {
    status.value = 'error';
    errorMsg.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      'No se pudo activar la cuenta. El enlace puede estar expirado o ya haber sido usado.';
  }
}

onMounted(() => {
  const token = route.query.token;
  tryActivate(token);
});
</script>

<template>
  <AuthLayout :illustration="mailArt" illustration-alt="Correo de activación">
    <AppCard title="Activación de cuenta" subtitle="Pet Spa">
      <!-- Cargando -->
      <div v-if="status === 'loading'" class="state">
        <div class="spinner" aria-hidden="true"></div>
        <p>Activando tu cuenta…</p>
      </div>

      <!-- Éxito -->
      <div v-else-if="status === 'success'" class="state state-success">
        <div class="big-emoji" aria-hidden="true">🎉</div>
        <h3>¡Cuenta activada!</h3>
        <p class="muted">Te estamos llevando a tu panel…</p>
      </div>

      <!-- Error -->
      <div v-else class="state state-error">
        <div class="big-emoji" aria-hidden="true">⏰</div>
        <h3>No se pudo activar</h3>
        <p>{{ errorMsg }}</p>
        <p class="muted">Si el enlace expiró, registra tu cuenta de nuevo o contacta al administrador.</p>

        <div class="actions">
          <PrimaryButton variant="primary" @click="router.push('/login')">
            Ir a Login
          </PrimaryButton>
          <PrimaryButton variant="ghost" @click="router.push('/register')">
            Registrarme de nuevo
          </PrimaryButton>
        </div>
      </div>
    </AppCard>
  </AuthLayout>
</template>

<style scoped>
.state {
  text-align: center;
  padding: 1rem 0;
}
.big-emoji { font-size: 3rem; line-height: 1; margin-bottom: 0.5rem; }
.state h3 { margin: 0.25rem 0; }

.spinner {
  width: 40px; height: 40px;
  border: 4px solid var(--color-primary-soft);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  margin: 0.5rem auto;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.actions {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.state-success p { color: var(--color-text-soft); }
.state-error h3  { color: var(--color-danger); }
</style>
