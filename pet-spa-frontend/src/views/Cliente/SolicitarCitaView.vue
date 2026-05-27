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
const groomers  = ref([]);   // lista extraída del primer fetch de slots (sin filtro)

// ── Form selections ───────────────────────────────────────────
const selectedMascota          = ref('');
const selectedServicio         = ref('');
const selectedFecha            = ref('');
const selectedSlot             = ref(null);
const selectedGroomerPreferido = ref('');

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

const selectedGroomerNombre = computed(() => {
  if (!selectedGroomerPreferido.value) return '';
  return groomers.value.find((g) => g.id_trabajador === selectedGroomerPreferido.value)?.nombre || '';
});

// ── Watchers ──────────────────────────────────────────────────
// Cuando cambia mascota/servicio/fecha → reset completo incluyendo groomer y su lista
watch([selectedMascota, selectedServicio, selectedFecha], ([m, s, f]) => {
  slots.value = [];
  groomers.value = [];
  selectedSlot.value = null;
  selectedGroomerPreferido.value = '';
  slotsError.value = '';
  if (m && s && f) fetchSlots();
});

// Cuando el cliente elige (o quita) un groomer preferido → refetch filtrado
watch(selectedGroomerPreferido, () => {
  if (!canLoadSlots.value) return;
  slots.value = [];
  selectedSlot.value = null;
  slotsError.value = '';
  fetchSlots();
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
    const params = {
      fecha:       selectedFecha.value,
      id_servicio: selectedServicio.value,
      id_mascota:  selectedMascota.value,
    };
    if (selectedGroomerPreferido.value) {
      params.id_trabajador = selectedGroomerPreferido.value;
    }

    const data = await agendaApi.getDisponibilidad(params);
    if (!data.dia_laboral) {
      slotsError.value = 'Ese día no es laborable o tiene un bloqueo. Elige otra fecha.';
      return;
    }
    slots.value = data.slots || [];

    // Construir la lista de groomers únicamente en el fetch sin filtro.
    // Esto da la lista de groomers que tienen al menos un slot disponible ese día.
    if (!selectedGroomerPreferido.value) {
      const groomerMap = new Map();
      for (const slot of slots.value) {
        for (const g of (slot.groomers_disponibles || [])) {
          if (!groomerMap.has(g.id_trabajador)) groomerMap.set(g.id_trabajador, g);
        }
      }
      groomers.value = [...groomerMap.values()];
    }

    if (availableSlots.value.length === 0) {
      slotsError.value = selectedGroomerPreferido.value
        ? 'El groomer seleccionado no tiene horarios disponibles para esta fecha. Elige otro día o selecciona otro groomer.'
        : 'No hay horarios disponibles para esa fecha. Prueba otro día.';
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
    const payload = {
      id_mascota:  selectedMascota.value,
      id_servicio: selectedServicio.value,
      fecha_cita:  selectedFecha.value,
      hora_inicio: selectedSlot.value.hora_inicio,
    };
    if (selectedGroomerPreferido.value) {
      payload.id_trabajador_preferido = selectedGroomerPreferido.value;
    }
    await citaApi.crearCita(payload);
    successMsg.value = '✅ ¡Cita solicitada! Queda pendiente de confirmación por recepción.';
    selectedMascota.value          = '';
    selectedServicio.value         = '';
    selectedFecha.value            = '';
    selectedSlot.value             = null;
    selectedGroomerPreferido.value = '';
    groomers.value                 = [];
    slots.value                    = [];
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

    <p v-if="errorMsg"   class="error">{{ errorMsg }}</p>
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
                <template v-if="s.duracion_estimada_min"> — {{ s.duracion_estimada_min }} min</template>
                <template v-if="s.precio"> · Bs {{ Number(s.precio).toFixed(2) }}</template>
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

      <!-- ── Step 3: Groomer (opcional) + Horario ──────────── -->
      <AppCard title="3. Elige el horario">
        <div v-if="loadingSlots" class="state">Buscando horarios disponibles…</div>
        <p v-else-if="slotsError" class="warn">{{ slotsError }}</p>
        <p v-else-if="!canLoadSlots" class="muted">
          Completa los pasos anteriores para ver los horarios disponibles.
        </p>

        <template v-else>
          <!-- Selector de groomer preferido: aparece cuando hay groomers disponibles ese día -->
          <div v-if="groomers.length > 0" class="field groomer-filter-field">
            <label>
              Groomer preferido
              <span class="muted">(opcional)</span>
            </label>
            <select v-model="selectedGroomerPreferido">
              <option value="">Sin preferencia — mostrar todos los horarios</option>
              <option
                v-for="g in groomers"
                :key="g.id_trabajador"
                :value="g.id_trabajador"
              >
                {{ g.nombre }}{{ g.especialidad ? ` · ${g.especialidad}` : '' }}
              </option>
            </select>
            <small class="muted">
              Al elegir un groomer, solo verás los horarios disponibles para él/ella
              según su turno.
            </small>
          </div>

          <!-- Grid de slots -->
          <div v-if="availableSlots.length" class="slots-grid">
            <button
              v-for="s in availableSlots"
              :key="s.hora_inicio"
              class="slot-btn"
              :class="{ 'slot-btn--selected': selectedSlot?.hora_inicio === s.hora_inicio }"
              type="button"
              @click="selectedSlot = s"
            >
              <span class="slot-time">{{ slotLabel(s) }}</span>
              <span class="slot-estado-row">
                <span class="badge" :class="slotBadgeClass(s)">
                  {{ s.estado === 'parcial' ? 'Parcialmente ocupado' : 'Libre' }}
                </span>
                <span
                  v-if="s.estado === 'parcial'"
                  class="slot-info-icon"
                  title="Este horario está parcialmente ocupado: hay otro servicio programado cerca de este rango. El servicio podría comenzar unos minutos más tarde o terminar un poco después, incluyendo el tiempo de limpieza de la estación de trabajo."
                >ℹ</span>
              </span>
            </button>
          </div>

          <div
            v-if="selectedSlot?.estado === 'parcial'"
            class="slot-parcial-note"
          >
            <b>ℹ Horario parcialmente ocupado</b> — Hay otro servicio programado cerca
            de este rango. Tu cita podría comenzar unos minutos más tarde o terminar un
            poco después, incluyendo el tiempo de limpieza de la estación de trabajo.
          </div>
        </template>
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
            <span>
              {{ servicios.find(s => s.id_servicio === selectedServicio)?.nombre }}
              <span v-if="servicios.find(s => s.id_servicio === selectedServicio)?.duracion_estimada_min" class="summary-duration">
                · {{ servicios.find(s => s.id_servicio === selectedServicio).duracion_estimada_min }} min
              </span>
            </span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Precio:</span>
            <span>Bs {{ Number(servicios.find(s => s.id_servicio === selectedServicio)?.precio || 0).toFixed(2) }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Fecha:</span>
            <span>{{ selectedFecha }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Horario:</span>
            <span>{{ slotLabel(selectedSlot) }}</span>
          </div>
          <div v-if="selectedGroomerNombre" class="summary-row">
            <span class="summary-label">Groomer:</span>
            <span>{{ selectedGroomerNombre }} <span class="muted">(preferencia)</span></span>
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

.groomer-filter-field { margin-bottom: 1rem; }

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
.slot-estado-row { display: flex; align-items: center; gap: 0.25rem; }
.slot-info-icon {
  font-size: 0.75rem;
  color: var(--color-text-soft);
  cursor: help;
  border: 1px solid var(--color-card-border);
  border-radius: 50%;
  width: 1rem; height: 1rem;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.slot-parcial-note {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  padding: 0.6rem 0.9rem;
  line-height: 1.45;
}

.summary { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
.summary-row { display: flex; gap: 0.75rem; font-size: 0.95rem; }
.summary-label { font-weight: 700; color: var(--color-text-soft); min-width: 80px; }
.summary-duration { color: var(--color-text-soft); font-size: 0.88rem; }

.form-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
</style>
