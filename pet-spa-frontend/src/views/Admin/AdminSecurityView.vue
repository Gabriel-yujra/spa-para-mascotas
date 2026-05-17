<script setup>
// PARCHE — Bug 1:
// Antes: estado en una `ref` local hidratada en onMounted → al cambiar de
// pestaña y volver, durante un instante se mostraba "desactivado" porque
// la ref arrancaba en false.
//
// Ahora: el estado viene de un `computed` sobre `authStore.user.two_factor_enabled`.
// Como ese campo se persiste en el store y en localStorage, al volver la
// vista renderiza el valor correcto INMEDIATAMENTE — sin parpadeo.
// Adicionalmente:
//   - Mostramos un estado "cargando" explícito mientras `refreshMe()` corre,
//     para que NUNCA se muestre el panel "Configurar 2FA" si el flag aún no
//     está cargado.
//   - Tras enable/disable usamos la respuesta directa del backend
//     (que ahora incluye `two_factor_enabled`) y `setTwoFactorEnabled()`
//     para actualizar el store en O(1), sin un fetch /me extra.
import { ref, computed, onMounted } from 'vue';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/store/authStore';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const auth = useAuthStore();

// ✅ Fuente de verdad: el store. Reactivo, persistido, normalizado a boolean.
const twoFAEnabled = computed(() => !!auth.twoFactorEnabled);

// `hydrated` evita el parpadeo al entrar/volver: solo cuando hayamos
// confirmado el estado contra el backend mostramos los paneles.
const hydrated = ref(false);

// Setup
const setupData = ref(null);
const setupCode = ref('');
const setupLoading = ref(false);
const setupError = ref('');
const setupSuccess = ref('');

// Disable
const disablePassword = ref('');
const disableCode = ref('');
const disableLoading = ref(false);
const disableError = ref('');

// Sincroniza el flag con backend al montar la vista.
async function loadStatus() {
  try {
    await auth.refreshMe();
  } finally {
    hydrated.value = true;
  }
}

async function startSetup() {
  setupError.value = '';
  setupSuccess.value = '';
  setupLoading.value = true;
  try {
    setupData.value = await authApi.twoFASetup();
  } catch (err) {
    setupError.value = err.response?.data?.error || 'Error al iniciar 2FA';
  } finally {
    setupLoading.value = false;
  }
}

async function confirmEnable() {
  setupError.value = '';
  if (!/^\d{6}$/.test(setupCode.value.trim())) {
    setupError.value = 'El código debe tener 6 dígitos';
    return;
  }
  setupLoading.value = true;
  try {
    const resp = await authApi.twoFAEnable(setupCode.value.trim());

    // El backend ahora devuelve { two_factor_enabled: true }.
    // Caemos al refreshMe() solo como red de seguridad si por alguna razón no viene.
    if ('two_factor_enabled' in resp) {
      auth.setTwoFactorEnabled(resp.two_factor_enabled);
    } else {
      await auth.refreshMe();
    }

    setupSuccess.value = '✅ 2FA habilitado correctamente';
    setupData.value = null;
    setupCode.value = '';
  } catch (err) {
    setupError.value = err.response?.data?.error || 'Código inválido';
  } finally {
    setupLoading.value = false;
  }
}

async function disable2FA() {
  disableError.value = '';
  if (!disablePassword.value || !/^\d{6}$/.test(disableCode.value.trim())) {
    disableError.value = 'Password y código (6 dígitos) son obligatorios';
    return;
  }
  disableLoading.value = true;
  try {
    const resp = await authApi.twoFADisable(disablePassword.value, disableCode.value.trim());

    if ('two_factor_enabled' in resp) {
      auth.setTwoFactorEnabled(resp.two_factor_enabled);
    } else {
      await auth.refreshMe();
    }

    disablePassword.value = '';
    disableCode.value = '';
  } catch (err) {
    disableError.value = err.response?.data?.error || 'No se pudo deshabilitar';
  } finally {
    disableLoading.value = false;
  }
}

const statusBadge = computed(() => (twoFAEnabled.value ? 'Activado' : 'Desactivado'));

onMounted(loadStatus);
</script>

<template>
  <div class="security-page">
    <header class="header">
      <h2>🛡️ Seguridad de mi cuenta</h2>
      <p class="muted">Configuración de autenticación de dos factores (2FA)</p>
    </header>

    <AppCard
      title="Estado actual del 2FA"
      :subtitle="`Tu cuenta de admin: ${auth.user?.email || ''}`"
    >
      <p v-if="!hydrated">Cargando…</p>
      <div v-else class="status-row">
        <span class="badge" :class="twoFAEnabled ? 'badge-success' : 'badge-muted'">
          {{ statusBadge }}
        </span>
        <span class="muted" v-if="twoFAEnabled">
          Tu cuenta requerirá un código TOTP en cada inicio de sesión.
        </span>
        <span class="muted" v-else>
          Activa 2FA para añadir una capa extra de protección.
        </span>
      </div>
    </AppCard>

    <!-- Mientras NO hayamos confirmado el estado, no mostramos paneles
         para evitar el flash "Configurar 2FA" cuando ya estaba activado. -->
    <template v-if="hydrated">
      <!-- ============ ACTIVAR 2FA ============ -->
      <AppCard
        v-if="!twoFAEnabled"
        title="Configurar 2FA"
        subtitle="Pasos para activar"
      >
        <div v-if="!setupData">
          <ol class="steps">
            <li>Pulsa <b>Configurar 2FA</b>.</li>
            <li>Escanea el código QR con Google Authenticator, Authy, o similar.</li>
            <li>Ingresa el código de 6 dígitos para confirmar.</li>
          </ol>

          <PrimaryButton @click="startSetup" :loading="setupLoading" size="lg">
            Configurar 2FA
          </PrimaryButton>
          <p v-if="setupError" class="error">{{ setupError }}</p>
          <p v-if="setupSuccess" class="success">{{ setupSuccess }}</p>
        </div>

        <div v-else class="setup-detail">
          <div class="qr-block">
            <img
              v-if="setupData.qr_data_url"
              :src="setupData.qr_data_url"
              alt="QR para 2FA"
              class="qr"
            />
            <div v-else class="qr-fallback">
              <p>Escanea esta URL otpauth o pega manualmente la clave:</p>
              <code class="otpauth">{{ setupData.otpauth_url }}</code>
            </div>

            <div class="secret-row">
              <label>Clave (base32)</label>
              <code class="secret">{{ setupData.secret }}</code>
              <small class="muted">
                Guárdala en un lugar seguro como respaldo.
              </small>
            </div>
          </div>

          <form @submit.prevent="confirmEnable" class="confirm-form">
            <div class="field">
              <label>Código de 6 dígitos</label>
              <input
                v-model="setupCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
                class="totp-input"
                autocomplete="one-time-code"
              />
            </div>
            <p v-if="setupError" class="error">{{ setupError }}</p>
            <PrimaryButton type="submit" :loading="setupLoading" block size="lg" variant="accent">
              Activar 2FA
            </PrimaryButton>
          </form>
        </div>
      </AppCard>

      <!-- ============ DESACTIVAR 2FA ============ -->
      <AppCard
        v-else
        title="Desactivar 2FA"
        subtitle="Confirma tu identidad para deshabilitarlo"
        variant="accent"
      >
        <p class="warn">
          ⚠️ Si desactivas 2FA, tu cuenta volverá a depender solo de la contraseña.
        </p>

        <form @submit.prevent="disable2FA">
          <div class="field">
            <label>Contraseña actual</label>
            <input v-model="disablePassword" type="password" autocomplete="current-password" required />
          </div>
          <div class="field">
            <label>Código TOTP actual</label>
            <input
              v-model="disableCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              class="totp-input"
            />
          </div>
          <p v-if="disableError" class="error">{{ disableError }}</p>
          <PrimaryButton type="submit" variant="danger" :loading="disableLoading" size="lg">
            Desactivar 2FA
          </PrimaryButton>
        </form>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.security-page { display: flex; flex-direction: column; gap: 1.25rem; }
.header h2 { margin: 0 0 0.25rem 0; }
.steps { padding-left: 1.2rem; line-height: 1.7; color: var(--color-text-soft); }

.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.setup-detail {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}
@media (min-width: 720px) {
  .setup-detail { grid-template-columns: 220px 1fr; align-items: start; }
}

.qr-block { text-align: center; }
.qr {
  width: 200px;
  height: 200px;
  background: #fff;
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  display: block;
  margin: 0 auto 0.75rem auto;
}
.qr-fallback { text-align: left; }
.otpauth {
  display: block;
  background: var(--color-bg-soft);
  padding: 0.5rem;
  border-radius: 8px;
  word-break: break-all;
  font-size: 0.78rem;
  margin-top: 0.4rem;
}

.secret-row { text-align: left; margin-top: 0.6rem; }
.secret {
  display: block;
  background: var(--color-bg-soft);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  margin: 0.25rem 0;
  word-break: break-all;
}

.totp-input {
  letter-spacing: 0.6em;
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
}

.warn {
  background: #fef3c7;
  color: #92400e;
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}
</style>
