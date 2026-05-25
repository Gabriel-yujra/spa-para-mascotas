<script setup>
import { ref, onMounted } from 'vue';
import { clienteApi } from '@/api/clienteApi';
import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const loading    = ref(false);
const saving     = ref(false);
const errorMsg   = ref('');
const successMsg = ref('');

const perfil = ref(null);

const form = ref({
  telefono:          '',
  ci:                '',
  direccion:         '',
  canal_notificacion: '',
  horarios_preferidos: '',
});

const CANALES = [
  { value: '',          label: 'Sin preferencia' },
  { value: 'email',     label: 'Email' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'sms',       label: 'SMS' },
];

async function loadPerfil() {
  loading.value  = true;
  errorMsg.value = '';
  try {
    const data = await clienteApi.getMiPerfil();
    perfil.value = data.cliente;
    form.value = {
      telefono:           data.cliente.telefono           || '',
      ci:                 data.cliente.ci                 || '',
      direccion:          data.cliente.direccion           || '',
      canal_notificacion: data.cliente.canal_notificacion || '',
      horarios_preferidos: data.cliente.horarios_preferidos || '',
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar el perfil';
  } finally {
    loading.value = false;
  }
}

async function onGuardar() {
  errorMsg.value   = '';
  successMsg.value = '';
  saving.value     = true;
  try {
    const payload = {
      telefono:           form.value.telefono.trim()           || null,
      ci:                 form.value.ci.trim()                 || null,
      direccion:          form.value.direccion.trim()           || null,
      canal_notificacion: form.value.canal_notificacion        || null,
      horarios_preferidos: form.value.horarios_preferidos.trim() || null,
    };
    const data = await clienteApi.updateMiPerfil(payload);
    perfil.value = { ...perfil.value, ...data.cliente };
    successMsg.value = '✅ Perfil actualizado correctamente';
  } catch (err) {
    errorMsg.value = err.response?.data?.error || err.response?.data?.message || 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

onMounted(loadPerfil);
</script>

<template>
  <div class="perfil-page">
    <header class="page-header">
      <h2>👤 Mi perfil</h2>
      <p class="muted">Mantén tus datos de contacto actualizados</p>
    </header>

    <p v-if="errorMsg"   class="error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="success">{{ successMsg }}</p>

    <div v-if="loading" class="state">Cargando perfil…</div>

    <template v-else-if="perfil">
      <!-- Datos de cuenta (solo lectura) -->
      <AppCard title="Datos de cuenta" variant="soft">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Nombre</span>
            <span class="info-value">{{ perfil.nombre }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">{{ perfil.email }}</span>
          </div>
        </div>
        <small class="muted">Para cambiar nombre o email contacta al spa.</small>
      </AppCard>

      <!-- Datos editables -->
      <AppCard title="Datos de contacto">
        <div class="form-grid">
          <div class="field">
            <label>Teléfono</label>
            <input
              v-model="form.telefono"
              type="tel"
              placeholder="Ej. 70012345"
            />
          </div>

          <div class="field">
            <label>CI (carnet de identidad)</label>
            <input
              v-model="form.ci"
              type="text"
              placeholder="Ej. 12345678"
            />
          </div>

          <div class="field field--wide">
            <label>Dirección</label>
            <input
              v-model="form.direccion"
              type="text"
              placeholder="Ej. Av. Las Américas #123, zona Norte"
            />
          </div>

          <div class="field">
            <label>Canal de notificación preferido</label>
            <select v-model="form.canal_notificacion">
              <option v-for="c in CANALES" :key="c.value" :value="c.value">
                {{ c.label }}
              </option>
            </select>
            <small class="muted">Por este canal recibirás recordatorios de citas.</small>
          </div>

          <div class="field field--wide">
            <label>Horarios preferidos</label>
            <input
              v-model="form.horarios_preferidos"
              type="text"
              placeholder="Ej. Mañanas entre semana, fines de semana por la tarde…"
            />
          </div>
        </div>

        <div class="form-actions">
          <PrimaryButton :loading="saving" @click="onGuardar">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </PrimaryButton>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.perfil-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.info-item { display: flex; flex-direction: column; gap: 0.15rem; }
.info-label { font-size: 0.78rem; color: var(--color-text-soft); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.info-value { font-weight: 600; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}
.field--wide { grid-column: 1 / -1; }
.form-actions { margin-top: 0.75rem; }

.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
</style>
