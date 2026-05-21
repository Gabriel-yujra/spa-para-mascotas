<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { mascotaApi } from '@/api/mascotaApi';
import { servicioApi } from '@/api/servicioApi';
import { agendaApi }   from '@/api/agendaApi';
import { citaApi }     from '@/api/citaApi';
import AppCard        from '@/components/AppCard.vue';
import PrimaryButton  from '@/components/PrimaryButton.vue';

const router = useRouter();

// ── Data ──────────────────────────────────────────────────────
const mascotas  = ref([]);
const servicios = ref([]);
const slots     = ref([]);

// ── Form selections ───────────────────────────────────────────
const selectedMascota  = ref('');
const selectedServicio = ref('');
const selectedFecha    = ref('');
const selectedSlot     = ref(null);   // { hora_inicio, hora_fin }

// ── UI state ──────────────────────────────────────────────────
const loadingInit  = ref(false);
const loadingSlots = ref(false);
const submitting   = ref(false);
const errorMsg     = ref('');
const successMsg   = ref('');
const slotsError   = ref('');

// ── Helpers ───────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

const canLoadSlots = computed(
  () => selectedMascota.value && selectedServicio.value && selectedFecha.value
);

const availableSlots = computed(() =>
  slots.value.filter((s) => s.estado !== 'ocupado')
);

function slotLabel(s) {
  return `${s.hora_inicio} – ${s.hora_fin}`;
}

function slotBadgeClass(s) {
  return s.estado === 'parcial' ? 'badge-warning' : 'badge-success';
}

// ── Watchers: auto-load slots when all 3 selections are ready ─
watch([selectedMascota, selectedServicio, selectedFecha], ([m, s, f]) => {
  slots.value = [];
  selectedSlot.value = null;
  slotsError.value = '';
  if (m && s && f) fetchSlots();
});

// ── Load mascotas + servicios on mount ────────────────────────
async function loadInit() {
  loadingInit.value = true;
  errorMsg.value = '';
  try {
    const [mResp, sResp] = await Promise.all([
      mascotaApi.getMisMascotas(),
      servicioApi.getServicios(),
    ]);
    mascotas.value  = mResp.mascotas  || [];
    servicios.value = sResp.servicios || [];
  } catch (err) {
    errorMsg.value = 'Error al cargar datos. Intenta recargar la página.';
  } finally {
    loadingInit.value = false;
  }
}

// ── Fetch availability slots ──────────────────────────────────
async function fetchSlots() {
  loadingSlots.value = true;
  slotsError.value = '';
  slots.value = [];
  selectedSlot.value = null;
  try {
    const data = await agendaApi.getDisponibilidad({
      fecha:        selectedFecha.value,
      id_servicio:  selectedServicio.value,
      id_mascota:   selectedMascota.value,
    });
    if (!data.dia_laboral) {
      slotsError.value = 'Ese día no es laborable o tiene un bloqueo. Elige otra fecha.';
      return;
    }
    slots.value = data.slots || [];
    if (availableSlots.value.length === 0) {
      slotsError.value = 'No hay horarios disponibles para esa fecha. Prueba otro día.';
    }
  } catch (err) {
    slotsError.value = err.response?.data?.error || 'Error al consultar disponibilidad';
  } finally {
    loadingSlots.value = false;
  }
}

// ── Submit appointment ────────────────────────────────────────
async function onSubmit() {
  errorMsg.value = '';
  if (!selectedSlot.value) {
    errorMsg.value = 'Selecciona un horario disponible';
    return;
  }
  submitting.value = true;
  try {
    await citaApi.crearCita({
      id_mascota:  selectedMascota.value,
      id_servicio: selectedServicio.value,
      fecha_cita:  selectedFecha.value,
      hora_inicio: selectedSlot.value.hora_inicio,
    });
    successMsg.value = '✅ ¡Cita solicitada! Queda pendiente de confirmación por recepción.';
    // Reset form
    selectedMascota.value  = '';
    selectedServicio.value = '';
    selectedFecha.value    = '';
    selectedSlot.value     = null;
    slots.value            = [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || err.response?.data?.message || 'Error al solicitar la cita';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadInit);
</script>

<template>
  <div class="solicitar-page">
    <header class="page-header">
      <h2>📅 Solicitar cita</h2>
      <p class="muted">Elige tu mascota, el servicio y el horario que prefieras</p>
    </header>

    <p v-if="errorMsg"  class="error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="success">{{ successMsg }}</p>

    <div v-if="loadingInit" class="state">Cargando datos…</div>

    <template v-else>
      <!-- ── Step 1: Pet + Service ──────────────────────────── -->
      <AppCard title="1. Elige mascota y servicio">
        <div class="form-grid">
          <div class="field">
            <label>Mascota</label>
            <select v-model="selectedMascota">
              <option value="" disabled>Selecciona una mascota...</option>
              <option
                v-for="m in mascotas"
                :key="m.id_mascota"
                :value="m.id_mascota"
              >
                {{ m.nombre }}{{ m.raza ? ` (${m.raza})` : '' }}
              </option>
            </select>
            <small v-if="!mascotas.length" class="warn">
              No tienes mascotas registradas.
              <router-link to="/mis-mascotas">Registra una aquí.</router-link>
            </small>
          </div>

          <div class="field">
            <label>Servicio</label>
            <select v-model="selectedServicio">
              <option value="" disabled>Selecciona un servicio...</option>
              <option
                v-for="s in servicios"
                :key="s.id_servicio"
                :value="s.id_servicio"
              >
                {{ s.nombre }}
                <template v-if="s.precio"> — Bs {{ Number(s.precio).toFixed(2) }}</template>
              </option>
            </select>
          </div>
        </div>
      </AppCard>

      <!-- ── Step 2: Date ──────────────────────────────────── -->
      <AppCard title="2. Elige la fecha">
        <div class="field field--narrow">
          <label>Fecha de la cita</label>
          <input
            v-model="selectedFecha"
            type="date"
            :min="today"
            :disabled="!selectedMascota || !selectedServicio"
          />
          <small class="muted" v-if="!selectedMascota || !selectedServicio">
            Selecciona mascota y servicio primero.
          </small>
        </div>
      </AppCard>

      <!-- ── Step 3: Time slot ─────────────────────────────── -->
      <AppCard title="3. Elige el horario">
        <div v-if="loadingSlots" class="state">Buscando horarios disponibles…</div>
        <p v-else-if="slotsError" class="warn">{{ slotsError }}</p>
        <p v-else-if="!canLoadSlots" class="muted">
          Completa los pasos anteriores para ver los horarios disponibles.
        </p>
        <div v-else-if="availableSlots.length" class="slots-grid">
          <button
            v-for="s in availableSlots"
            :key="s.hora_inicio"
            class="slot-btn"
            :class="{ 'slot-btn--selected': selectedSlot?.hora_inicio === s.hora_inicio }"
            type="button"
            @click="selectedSlot = s"
          >
            <span class="slot-time">{{ slotLabel(s) }}</span>
            <span class="badge" :class="slotBadgeClass(s)">
              {{ s.estado === 'parcial' ? 'Parcial' : 'Libre' }}
            </span>
          </button>
        </div>
      </AppCard>

      <!-- ── Summary + Submit ──────────────────────────────── -->
      <AppCard v-if="selectedSlot" title="Confirmar cita" variant="accent">
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Mascota:</span>
            <span>{{ mascotas.find(m => m.id_mascota === selectedMascota)?.nombre }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Servicio:</span>
            <span>{{ servicios.find(s => s.id_servicio === selectedServicio)?.nombre }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Fecha:</span>
            <span>{{ selectedFecha }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Horario:</span>
            <span>{{ slotLabel(selectedSlot) }}</span>
          </div>
        </div>

        <div class="form-actions">
          <PrimaryButton :loading="submitting" @click="onSubmit">
            {{ submitting ? 'Enviando…' : 'Confirmar solicitud' }}
          </PrimaryButton>
          <PrimaryButton variant="ghost" @click="selectedSlot = null">
            Cambiar horario
          </PrimaryButton>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.solicitar-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}
.field--narrow { max-width: 320px; }

.state  { padding: 1.5rem; text-align: center; color: var(--color-text-soft); }

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.6rem;
}
.slot-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.75rem 0.5rem;
  border: 2px solid var(--color-card-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.slot-btn:hover { border-color: var(--color-primary); background: var(--color-primary-soft); }
.slot-btn--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}
.slot-time { font-weight: 700; font-size: 0.95rem; }

.summary { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
.summary-row { display: flex; gap: 0.75rem; font-size: 0.95rem; }
.summary-label { font-weight: 700; color: var(--color-text-soft); min-width: 80px; }

.form-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
</style>
