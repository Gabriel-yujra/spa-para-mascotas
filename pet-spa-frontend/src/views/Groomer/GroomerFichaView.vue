<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { groomingApi } from '@/api/groomingApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const route  = useRoute();
const router = useRouter();

const idCita = route.params.idCita;

const mascota     = ref(null);
const ficha       = ref(null);
const loading     = ref(false);
const saving      = ref(false);
const errorMsg    = ref('');
const successMsg  = ref('');

// Editable ficha fields
const form = ref({
  estado_ingreso:       '',
  observaciones:        '',
  tamano_mascota:       '',
  temperatura:          '',
  notas_internas:       '',
  nuevo_estado_global:  '',
});

const ESTADO_LABELS = {
  pendiente:    'Pendiente',
  confirmada:   'Confirmada',
  en_progreso:  'En progreso',
  completada:   'Completada',
  cancelada:    'Cancelada',
  no_asistio:   'No asistió',
  reprogramada: 'Reprogramada',
};

// Estado transitions the groomer can request
const ESTADO_OPTIONS = [
  { value: '',             label: '— Sin cambio de estado —' },
  { value: 'en_progreso',  label: 'Marcar en progreso' },
  { value: 'completada',   label: 'Marcar completada' },
];

function tamanoLabel(t) {
  const map = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande', gigante: 'Gigante' };
  return map[t] || t || '—';
}

function estadoBadgeClass(e) {
  const map = {
    pendiente:    'badge-warning',
    confirmada:   '',
    en_progreso:  'badge-warning',
    completada:   'badge-success',
    cancelada:    'badge-danger',
    no_asistio:   'badge-danger',
    reprogramada: 'badge-warning',
  };
  return map[e] || '';
}

async function loadFicha() {
  loading.value  = true;
  errorMsg.value = '';
  try {
    const data = await groomingApi.getFicha(idCita);
    mascota.value = data.mascota || null;
    ficha.value   = data.ficha   || null;

    if (ficha.value) {
      form.value.estado_ingreso  = ficha.value.estado_ingreso  || '';
      form.value.observaciones   = ficha.value.observaciones   || '';
      form.value.tamano_mascota  = ficha.value.tamano_mascota  || '';
      form.value.temperatura     = ficha.value.temperatura     || '';
      form.value.notas_internas  = ficha.value.notas_internas  || '';
    }
  } catch (err) {
    if (err.response?.status === 403) {
      errorMsg.value = 'Esta cita no está asignada a tu usuario.';
    } else if (err.response?.status === 404) {
      errorMsg.value = 'Cita no encontrada.';
    } else {
      errorMsg.value = err.response?.data?.error || 'Error al cargar la ficha';
    }
  } finally {
    loading.value = false;
  }
}

async function guardar() {
  saving.value   = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const payload = {
      estado_ingreso:  form.value.estado_ingreso  || null,
      observaciones:   form.value.observaciones   || null,
      tamano_mascota:  form.value.tamano_mascota  || null,
      temperatura:     form.value.temperatura     || null,
      notas_internas:  form.value.notas_internas  || null,
    };
    if (form.value.nuevo_estado_global) {
      payload.nuevo_estado_global = form.value.nuevo_estado_global;
    }

    const data = await groomingApi.updateFicha(idCita, payload);
    if (data.ficha) ficha.value = data.ficha;
    successMsg.value = 'Ficha guardada correctamente.';
    form.value.nuevo_estado_global = '';
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al guardar la ficha';
  } finally {
    saving.value = false;
  }
}

onMounted(loadFicha);
</script>

<template>
  <div class="ficha-page">
    <div class="back-row">
      <button class="back-btn" @click="router.back()">← Volver a la agenda</button>
    </div>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <template v-if="!loading && mascota">
      <!-- ── Datos de la mascota ──────────────────────────────── -->
      <AppCard title="Mascota">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Nombre</span>
            <span class="detail-value">{{ mascota.nombre || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Especie / Raza</span>
            <span class="detail-value">
              {{ [mascota.especie, mascota.raza].filter(Boolean).join(' / ') || '—' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tamaño</span>
            <span class="detail-value">{{ tamanoLabel(mascota.tamano) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Temperamento</span>
            <span class="detail-value">{{ mascota.temperamento || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Alergias</span>
            <span v-if="mascota.alergias" class="badge badge-warning">{{ mascota.alergias }}</span>
            <span v-else class="muted">Ninguna</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Restricciones</span>
            <span v-if="mascota.restricciones" class="badge badge-warning">{{ mascota.restricciones }}</span>
            <span v-else class="muted">Ninguna</span>
          </div>
          <div v-if="mascota.notas" class="detail-item detail-item--full">
            <span class="detail-label">Notas del dueño</span>
            <span class="detail-value">{{ mascota.notas }}</span>
          </div>
        </div>
      </AppCard>

      <!-- ── Ficha de grooming ───────────────────────────────── -->
      <AppCard title="Ficha de grooming">
        <p v-if="successMsg" class="success">{{ successMsg }}</p>

        <div class="form-grid">
          <div class="field">
            <label>Estado de ingreso</label>
            <textarea
              v-model="form.estado_ingreso"
              rows="3"
              placeholder="Describe el estado del animal al ingresar…"
            ></textarea>
          </div>

          <div class="field">
            <label>Observaciones</label>
            <textarea
              v-model="form.observaciones"
              rows="3"
              placeholder="Observaciones generales del servicio…"
            ></textarea>
          </div>

          <div class="field">
            <label>Tamaño (verificado en consulta)</label>
            <select v-model="form.tamano_mascota">
              <option value="">— No especificado —</option>
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
              <option value="gigante">Gigante</option>
            </select>
          </div>

          <div class="field">
            <label>Temperatura (°C)</label>
            <input
              type="text"
              v-model="form.temperatura"
              placeholder="Ej. 38.5"
            />
          </div>

          <div class="field field--full">
            <label>Notas internas</label>
            <textarea
              v-model="form.notas_internas"
              rows="3"
              placeholder="Notas privadas del groomer (no visibles al cliente)…"
            ></textarea>
          </div>

          <div class="field">
            <label>Cambiar estado de la cita</label>
            <select v-model="form.nuevo_estado_global">
              <option v-for="opt in ESTADO_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <PrimaryButton @click="guardar" :loading="saving">Guardar cambios</PrimaryButton>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.ficha-page { display: flex; flex-direction: column; gap: 1.25rem; }

.back-row { margin-bottom: 0.25rem; }
.back-btn {
  background: none;
  border: 1px solid var(--color-card-border);
  color: var(--color-text-soft);
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.back-btn:hover { background: var(--color-bg-soft); }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.85rem 1.5rem;
}
.detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.detail-value { font-size: 0.95rem; color: var(--color-text); font-weight: 600; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.85rem 1.25rem;
}
.field--full { grid-column: 1 / -1; }

.form-actions { margin-top: 1rem; }
</style>
