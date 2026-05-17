<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/store/authStore';
import { isValidEmail, isStrongPassword, isNonEmpty } from '@/utils/validators';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue';
import AuthLayout from '@/components/AuthLayout.vue';
import petsArt from '@/assets/illustration-pets-spa.svg';

const auth = useAuthStore();

const form = ref({
  nombre: '',
  email: '',
  password: '',
  telefono: '',
  ci: '',
  direccion: '',
});

const loading = ref(false);
const errorMsg = ref('');

// Cuando el registro fue exitoso, mostramos pantalla "revisa tu correo".
const registered = ref(false);

async function onSubmit() {
  errorMsg.value = '';
  if (!isNonEmpty(form.value.nombre)) return (errorMsg.value = 'Nombre requerido');
  if (!isValidEmail(form.value.email)) return (errorMsg.value = 'Email inválido');
  const pwd = isStrongPassword(form.value.password);
  if (!pwd.valid) return (errorMsg.value = pwd.errors.join(' · '));
  if (!isNonEmpty(form.value.telefono)) return (errorMsg.value = 'Teléfono requerido');
  if (!isNonEmpty(form.value.ci)) return (errorMsg.value = 'CI requerido');
  if (!isNonEmpty(form.value.direccion)) return (errorMsg.value = 'Dirección requerida');

  loading.value = true;
  try {
    await auth.registerClient(form.value);
    registered.value = true;
  } catch (err) {
    errorMsg.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      'Error al registrarse';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout :illustration="petsArt" illustration-alt="Mascotas felices">
    <!-- Pantalla post-registro: "revisa tu correo" -->
    <AppCard
      v-if="registered"
      title="¡Cuenta creada! 🎉"
      subtitle="Tu cuenta está casi lista"
      variant="accent"
    >
      <p>
        Te hemos enviado un correo a <b>{{ form.email }}</b> con un enlace de activación.
      </p>
      <p class="muted">
        El enlace es válido por <b>15 minutos</b>. Si no lo encuentras, revisa tu carpeta
        de spam o promociones.
      </p>
      <p>Una vez actives tu cuenta, podrás iniciar sesión con normalidad.</p>

      <template #footer>
        <router-link to="/login">← Volver al login</router-link>
      </template>
    </AppCard>

    <!-- Formulario -->
    <AppCard
      v-else
      title="Crear cuenta de cliente"
      subtitle="Únete a Pet Spa y consiente a tus mascotas"
    >
      <form @submit.prevent="onSubmit">
        <div class="field">
          <label>Nombre completo</label>
          <input v-model="form.nombre" type="text" required />
        </div>

        <div class="field">
          <label>Email</label>
          <input v-model="form.email" type="email" autocomplete="email" required />
        </div>

        <div class="field">
          <label>Contraseña</label>
          <input v-model="form.password" type="password" autocomplete="new-password" required />
          <PasswordStrengthMeter :password="form.password" />
        </div>

        <div class="grid-2">
          <div class="field">
            <label>Teléfono</label>
            <input v-model="form.telefono" type="tel" required />
          </div>

          <div class="field">
            <label>CI</label>
            <input v-model="form.ci" type="text" required />
          </div>
        </div>

        <div class="field">
          <label>Dirección</label>
          <input v-model="form.direccion" type="text" required />
        </div>

        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

        <p class="info-pill">
          ℹ️ Tras registrarte, te enviaremos un correo con un enlace para
          <b>activar tu cuenta</b> (válido por 15 min).
        </p>

        <PrimaryButton type="submit" block :loading="loading" size="lg">
          {{ loading ? 'Creando...' : 'Crear cuenta' }}
        </PrimaryButton>
      </form>

      <p class="footer-text">
        ¿Ya tienes cuenta? <router-link to="/login">Inicia sesión</router-link>
      </p>
    </AppCard>
  </AuthLayout>
</template>

<style scoped>
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
@media (max-width: 480px) { .grid-2 { grid-template-columns: 1fr; gap: 0; } }

.info-pill {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  margin: 0.75rem 0 1rem 0;
}

.footer-text {
  margin-top: 1.25rem;
  font-size: 0.9rem;
  color: var(--color-text-soft);
  text-align: center;
}
</style>
