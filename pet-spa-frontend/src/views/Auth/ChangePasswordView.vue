<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/authStore';
import { isStrongPassword, isNonEmpty } from '@/utils/validators';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue';
import AuthLayout from '@/components/AuthLayout.vue';
import shieldArt from '@/assets/illustration-shield.svg';

const auth = useAuthStore();
const router = useRouter();

const oldPassword = ref('');
const newPassword = ref('');
const repeatNewPassword = ref('');

const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const pwdCheck = computed(() => isStrongPassword(newPassword.value));
const passwordsMatch = computed(
  () => repeatNewPassword.value === '' || repeatNewPassword.value === newPassword.value
);

async function onSubmit() {
  errorMsg.value = '';
  successMsg.value = '';

  if (!isNonEmpty(oldPassword.value)) return (errorMsg.value = 'Ingresa tu contraseña actual');
  if (!pwdCheck.value.valid) return (errorMsg.value = pwdCheck.value.errors.join(' · '));
  if (newPassword.value !== repeatNewPassword.value)
    return (errorMsg.value = 'Las contraseñas nuevas no coinciden');
  if (oldPassword.value === newPassword.value)
    return (errorMsg.value = 'La nueva contraseña debe ser distinta a la actual');

  loading.value = true;
  try {
    await auth.changePassword(oldPassword.value, newPassword.value);
    successMsg.value = '✅ Contraseña actualizada. Redirigiendo...';
    setTimeout(() => router.push('/'), 1000);
  } catch (err) {
    errorMsg.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      'Error al cambiar la contraseña';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout :illustration="shieldArt" illustration-alt="Seguridad">
    <AppCard title="Cambiar contraseña" subtitle="Mantén tu cuenta segura">
      <p v-if="auth.mustChangePassword" class="must-change">
        ⚠️ Debes cambiar tu contraseña inicial antes de continuar.
      </p>

      <form @submit.prevent="onSubmit">
        <div class="field">
          <label>Contraseña actual</label>
          <input v-model="oldPassword" type="password" autocomplete="current-password" required />
        </div>

        <div class="field">
          <label>Nueva contraseña</label>
          <input v-model="newPassword" type="password" autocomplete="new-password" required />
          <PasswordStrengthMeter :password="newPassword" />
        </div>

        <div class="field">
          <label>Repetir nueva contraseña</label>
          <input v-model="repeatNewPassword" type="password" autocomplete="new-password" required />
          <small v-if="!passwordsMatch" class="error">Las contraseñas no coinciden</small>
        </div>

        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
        <div v-if="successMsg" class="success">{{ successMsg }}</div>

        <PrimaryButton type="submit" block :loading="loading" size="lg">
          {{ loading ? 'Guardando...' : 'Cambiar contraseña' }}
        </PrimaryButton>
      </form>
    </AppCard>
  </AuthLayout>
</template>

<style scoped>
.must-change {
  background: #fef3c7;
  color: #92400e;
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
