<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/authStore';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import AuthLayout from '@/components/AuthLayout.vue';
import shieldArt from '@/assets/illustration-shield.svg';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const code = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function onVerify() {
  errorMsg.value = '';
  if (!/^\d{6}$/.test(code.value.trim())) {
    errorMsg.value = 'El código debe tener 6 dígitos';
    return;
  }
  loading.value = true;
  try {
    const data = await auth.verify2FA(code.value.trim());
    if (data.mustChangePassword) {
      router.push('/change-password');
    } else {
      const redirect = route.query.redirect || '/';
      router.push(redirect);
    }
  } catch (err) {
    errorMsg.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      'Código inválido o token expirado';
  } finally {
    loading.value = false;
  }
}

function cancel() {
  auth.cancelPending2FA();
  router.push('/login');
}
</script>

<template>
  <AuthLayout :illustration="shieldArt" illustration-alt="Verificación 2FA">
    <AppCard
      title="Verificación 2FA"
      subtitle="Ingresa el código de tu app autenticadora"
      variant="accent"
    >
      <p class="hint">
        Abre <b>Google Authenticator</b>, <b>Authy</b> o tu app TOTP de preferencia
        y escribe el código de 6 dígitos para <b>Pet Spa</b>.
      </p>

      <form @submit.prevent="onVerify">
        <div class="field">
          <label>Código TOTP</label>
          <input
            v-model="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            pattern="\d{6}"
            autocomplete="one-time-code"
            placeholder="000000"
            class="totp-input"
            autofocus
          />
        </div>

        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

        <PrimaryButton type="submit" block :loading="loading" size="lg">
          {{ loading ? 'Verificando...' : 'Verificar' }}
        </PrimaryButton>
      </form>

      <template #footer>
        <button class="link-btn" type="button" @click="cancel">← Cancelar e ir al login</button>
      </template>
    </AppCard>
  </AuthLayout>
</template>

<style scoped>
.hint {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  margin: 0 0 1rem 0;
}

.totp-input {
  letter-spacing: 0.6em;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary-dark);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  padding: 0;
}
.link-btn:hover { text-decoration: underline; }
</style>
