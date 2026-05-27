<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { citaApi }   from '@/api/citaApi';
import { agendaApi } from '@/api/agendaApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

// ── State ──────────────────────────────────────────────────────
const citas      = ref([]);
const loading    = ref(false);
const errorMsg   = ref('');
const successMsg = ref('');

// Filters
const filterModeFecha = ref('all');   // 'all' | 'day'
const selectedDate    = ref('');
const selectedEstado  = ref('ALL');   // 'ALL' | specific state

// Pagination
const router = useRouter();
const page  = ref(1);
const limit = ref(10);

// Action dialogs
const confirmId   = ref(null);
const noShowId    = ref(null);

const cancelId    = ref(null);
const cancelMotivo = ref('');

const reprogId      = ref(null);
const reprogCita    = ref(null);   // cita completa, necesaria para id_mascota / id_servicio
const reprogFecha   = ref('');
const reprogHora    = ref('');
const reprogGroomerId   = ref('');
const groomersReprog    = ref([]);
const loadingGroomers   = ref(false);

const actionLoading = ref(false);

// ── Helpers ────────────────────────────────────────────────────
const ESTADO_LABELS = {
  pendiente:    'Pendiente',
  confirmada:   'Confirmada',
  en_progreso:  'En progreso',
  completada:   'Completada',
  cancelada:    'Cancelada',
  no_asistio:   'No asistió',
  reprogramada: 'Reprogramada',
};

const ESTADO_OPTIONS = [
  { value: 'ALL',          label: 'Todos' },
  { value: 'pendiente',    label: 'Pendiente' },
  { value: 'confirmada',   label: 'Confirmada' },
  { value: 'reprogramada', label: 'Reprogramada' },
  { value: 'en_progreso',  label: 'En progreso' },
  { value: 'completada',   label: 'Completada' },
  { value: 'cancelada',    label: 'Cancelada' },
  { value: 'no_asistio',   label: 'No asistió' },
];

function estadoLabel(e) { return ESTADO_LABELS[e] || e; }

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

function formatFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatHora(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const TERMINALES = new Set(['completada', 'cancelada', 'no_asistio']);
function isActive(estado) { return !TERMINALES.has(estado); }

function canConfirmar(estado) { return estado === 'pendiente' || estado === 'reprogramada'; }
function canReprogramar(estado) { return ['pendiente', 'confirmada', 'reprogramada'].includes(estado); }
function canCancelar(estado)   { return ['pendiente', 'confirmada', 'reprogramada'].includes(estado); }
function canNoAsistio(estado)  { return estado === 'confirmada' || estado === 'reprogramada'; }

function clearDialogs() {
  confirmId.value     = null;
  noShowId.value      = null;
  cancelId.value      = null;
  cancelMotivo.value  = '';
  reprogId.value      = null;
  reprogCita.value    = null;
  reprogFecha.value   = '';
  reprogHora.value    = '';
  reprogGroomerId.value = '';
  groomersReprog.value  = [];
}

async function fetchGroomersReprog() {
  if (!reprogFecha.value || !reprogHora.value || !reprogCita.value) return;
  loadingGroomers.value = true;
  groomersReprog.value  = [];
  try {
    const data = await agendaApi.getGroomersDisponibles({
      fecha:       reprogFecha.value,
      hora_inicio: reprogHora.value,
      id_servicio: reprogCita.value.id_servicio,
      id_mascota:  reprogCita.value.id_mascota,
    });
    groomersReprog.value = data.groomers_disponibles || [];
  } catch {
    groomersReprog.value = [];
  } finally {
    loadingGroomers.value = false;
  }
}

watch([reprogFecha, reprogHora], ([f, h]) => {
  reprogGroomerId.value = '';
  groomersReprog.value  = [];
  if (f && h && reprogCita.value) fetchGroomersReprog();
});

// ── API calls ──────────────────────────────────────────────────
async function loadCitas() {
  loading.value  = true;
  errorMsg.value = '';
  clearDialogs();
  try {
    const params = {
      limit,
      offset: (page.value - 1) * limit.value,
    };
    if (filterModeFecha.value === 'day' && selectedDate.value) {
      params.fecha = selectedDate.value;
    }
    if (selectedEstado.value !== 'ALL') {
      params.estado = selectedEstado.value;
    }
    const data = await citaApi.listarCitasRecepcion(params);
    citas.value = data.citas || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar citas';
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  loadCitas();
}

function prevPage() {
  if (page.value > 1) {
    page.value--;
    loadCitas();
  }
}

function nextPage() {
  if (citas.value.length === limit.value) {
    page.value++;
    loadCitas();
  }
}

async function doConfirmar() {
  actionLoading.value = true;
  errorMsg.value = '';
  try {
    await citaApi.confirmarCita(confirmId.value);
    successMsg.value = '✅ Cita confirmada correctamente';
    await loadCitas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se pudo confirmar la cita';
    clearDialogs();
  } finally {
    actionLoading.value = false;
  }
}

async function doNoAsistio() {
  actionLoading.value = true;
  errorMsg.value = '';
  try {
    await citaApi.noAsistio(noShowId.value);
    successMsg.value = "✅ Cita marcada como 'No asistió'";
    await loadCitas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se pudo actualizar la cita';
    clearDialogs();
  } finally {
    actionLoading.value = false;
  }
}

async function doCancelar() {
  if (!cancelMotivo.value.trim()) {
    errorMsg.value = 'El motivo de cancelación es obligatorio';
    return;
  }
  actionLoading.value = true;
  errorMsg.value = '';
  try {
    await citaApi.cancelarCitaRecepcion(cancelId.value, { motivo: cancelMotivo.value });
    successMsg.value = '✅ Cita cancelada correctamente';
    await loadCitas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se pudo cancelar la cita';
    clearDialogs();
  } finally {
    actionLoading.value = false;
  }
}

async function doReprogramar() {
  if (!reprogFecha.value || !reprogHora.value) {
    errorMsg.value = 'Ingresa la nueva fecha y la nueva hora';
    return;
  }
  actionLoading.value = true;
  errorMsg.value = '';
  try {
    const payload = {
      nueva_fecha:       reprogFecha.value,
      nueva_hora_inicio: reprogHora.value,
    };
    if (reprogGroomerId.value) payload.nuevo_id_trabajador = reprogGroomerId.value;
    await citaApi.reprogramarCita(reprogId.value, payload);
    successMsg.value = '✅ Cita reprogramada correctamente';
    await loadCitas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se pudo reprogramar la cita';
    clearDialogs();
  } finally {
    actionLoading.value = false;
  }
}

onMounted(loadCitas);
</script>

<template>
  <div class="recepcion-citas-page">
    <header class="page-header">
      <h2>📅 Bandeja de citas</h2>
      <p class="muted">Vista para recepción y administración</p>
    </header>

    <!-- ── Filters ─────────────────────────────────────────── -->
    <AppCard title="Filtros" variant="soft">
      <div class="filter-row">
        <div class="field">
          <label>Fecha</label>
          <select v-model="filterModeFecha">
            <option value="all">Todos</option>
            <option value="day">Por día</option>
          </select>
        </div>

        <div v-if="filterModeFecha === 'day'" class="field">
          <label>Día</label>
          <input type="date" v-model="selectedDate" />
        </div>

        <div class="field">
          <label>Estado</label>
          <select v-model="selectedEstado">
            <option v-for="opt in ESTADO_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="filter-btn">
          <PrimaryButton @click="applyFilters" :loading="loading">Buscar</PrimaryButton>
        </div>
      </div>
    </AppCard>

    <!-- ── Feedback ────────────────────────────────────────── -->
    <p v-if="errorMsg"   class="error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="success">{{ successMsg }}</p>

    <!-- ── Confirmar dialog ─────────────────────────────────── -->
    <div v-if="confirmId" class="action-banner">
      <p><b>¿Confirmar esta cita?</b></p>
      <div class="action-btns">
        <PrimaryButton size="sm" :loading="actionLoading" @click="doConfirmar">
          Sí, confirmar
        </PrimaryButton>
        <PrimaryButton variant="ghost" size="sm" @click="clearDialogs">Cancelar</PrimaryButton>
      </div>
    </div>

    <!-- ── No asistió dialog ────────────────────────────────── -->
    <div v-if="noShowId" class="action-banner action-banner--warn">
      <p><b>¿Marcar como "No asistió"?</b> Esta acción es terminal.</p>
      <div class="action-btns">
        <PrimaryButton variant="danger" size="sm" :loading="actionLoading" @click="doNoAsistio">
          Confirmar
        </PrimaryButton>
        <PrimaryButton variant="ghost" size="sm" @click="clearDialogs">Volver</PrimaryButton>
      </div>
    </div>

    <!-- ── Cancelar dialog ──────────────────────────────────── -->
    <div v-if="cancelId" class="action-banner action-banner--warn">
      <div class="action-form">
        <p><b>Cancelar cita</b> — ingresa el motivo (obligatorio)</p>
        <div class="field">
          <input v-model="cancelMotivo" placeholder="Motivo de cancelación..." />
        </div>
      </div>
      <div class="action-btns">
        <PrimaryButton variant="danger" size="sm" :loading="actionLoading" @click="doCancelar">
          Cancelar cita
        </PrimaryButton>
        <PrimaryButton variant="ghost" size="sm" @click="clearDialogs">Volver</PrimaryButton>
      </div>
    </div>

    <!-- ── Reprogramar dialog ───────────────────────────────── -->
    <div v-if="reprogId" class="action-banner">
      <div class="action-form">
        <p><b>Reprogramar cita</b></p>
        <div class="reprog-fields">
          <div class="field">
            <label>Nueva fecha</label>
            <input type="date" v-model="reprogFecha" />
          </div>
          <div class="field">
            <label>Nueva hora (HH:MM)</label>
            <input type="time" v-model="reprogHora" />
          </div>
        </div>

        <!-- Selector de groomer (se activa cuando fecha y hora están listos) -->
        <div v-if="reprogFecha && reprogHora" class="field" style="margin-top:0.75rem">
          <label>Groomer <span style="font-weight:400;color:var(--color-text-soft)">(opcional)</span></label>
          <div v-if="loadingGroomers" style="font-size:0.85rem;color:var(--color-text-soft)">
            Verificando disponibilidad…
          </div>
          <template v-else>
            <select v-model="reprogGroomerId">
              <option value="">— Mantener groomer actual —</option>
              <option
                v-for="g in groomersReprog"
                :key="g.id_trabajador"
                :value="g.id_trabajador"
              >
                {{ g.nombre }}{{ g.especialidad ? ` · ${g.especialidad}` : '' }}
              </option>
            </select>
            <small
              v-if="!groomersReprog.length"
              style="color:var(--color-danger);font-size:0.82rem"
            >
              No hay groomers disponibles para ese horario. Elige otro.
            </small>
          </template>
        </div>
      </div>
      <div class="action-btns">
        <PrimaryButton size="sm" :loading="actionLoading" @click="doReprogramar">
          Guardar
        </PrimaryButton>
        <PrimaryButton variant="ghost" size="sm" @click="clearDialogs">Cancelar</PrimaryButton>
      </div>
    </div>

    <!-- ── Table ────────────────────────────────────────────── -->
    <AppCard :title="`Citas (${citas.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!citas.length" class="state">
        No hay citas para los filtros seleccionados.
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Fecha</th>
              <th>Mascota</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Groomer</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in citas" :key="c.id_cita">
              <td><b>{{ formatHora(c.hora_inicio) }}</b></td>
              <td>{{ formatFecha(c.fecha_cita) }}</td>
              <td>{{ c.mascota_nombre || '—' }}</td>
              <td>{{ c.cliente_nombre || '—' }}</td>
              <td>
                {{ c.servicio_nombre || '—' }}
                <br v-if="c.duracion_estimada_min" />
                <small v-if="c.duracion_estimada_min" class="dur-muted">{{ c.duracion_estimada_min }} min</small>
              </td>
              <td>{{ c.groomer_nombre || '—' }}</td>
              <td>
                <span class="badge" :class="estadoBadgeClass(c.estado_global)">
                  {{ estadoLabel(c.estado_global) }}
                </span>
              </td>
              <td class="actions-cell">
                <template v-if="isActive(c.estado_global)">
                  <button
                    v-if="canConfirmar(c.estado_global)"
                    class="link-btn"
                    @click="clearDialogs(); confirmId = c.id_cita"
                  >
                    Confirmar
                  </button>
                  <button
                    v-if="canReprogramar(c.estado_global)"
                    class="link-btn"
                    @click="clearDialogs(); reprogId = c.id_cita; reprogCita = c"
                  >
                    Reprogramar
                  </button>
                  <button
                    v-if="canNoAsistio(c.estado_global)"
                    class="link-btn"
                    @click="clearDialogs(); noShowId = c.id_cita"
                  >
                    No asistió
                  </button>
                  <button
                    v-if="canCancelar(c.estado_global)"
                    class="link-btn danger"
                    @click="clearDialogs(); cancelId = c.id_cita; cancelMotivo = ''"
                  >
                    Cancelar
                  </button>
                </template>
                <button
                  class="link-btn"
                  @click="router.push({ name: 'recepcion-ficha-grooming', params: { idCita: c.id_cita } })"
                >
                  Ver ficha
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Pagination ──────────────────────────────────────── -->
      <div class="pagination">
        <button class="page-btn" @click="prevPage" :disabled="page === 1">← Anterior</button>
        <span class="page-info">Página {{ page }}</span>
        <button class="page-btn" @click="nextPage" :disabled="citas.length < limit">Siguiente →</button>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.recepcion-citas-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}
.filter-row .field { flex: 1; min-width: 130px; margin-bottom: 0; }
.filter-btn { flex-shrink: 0; padding-bottom: 0.05rem; }

.action-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: var(--radius-md);
}
.action-banner--warn {
  background: #fff7ed;
  border-color: #fdba74;
}
.action-banner p { margin: 0 0 0.5rem 0; }
.action-form { flex: 1; min-width: 260px; }
.action-btns { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; padding-top: 0.25rem; }

.reprog-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.dur-muted { color: var(--color-text-soft); font-size: 0.78rem; }
.table-wrapper { overflow-x: auto; }

.actions-cell {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  min-width: 200px;
}
.link-btn {
  background: none;
  border: 1px solid var(--color-card-border);
  color: var(--color-text);
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.link-btn:hover { background: var(--color-bg-soft); }
.link-btn.danger { border-color: var(--color-danger); color: var(--color-danger); }
.link-btn.danger:hover { background: #fee2e2; }

.pagination {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--color-card-border);
}
.page-btn {
  background: none;
  border: 1px solid var(--color-card-border);
  color: var(--color-text-soft);
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.page-btn:hover:not(:disabled) { background: var(--color-bg-soft); color: var(--color-text); }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-info { font-size: 0.85rem; color: var(--color-text-soft); font-weight: 600; }

@media (max-width: 640px) {
  .filter-row { flex-direction: column; }
  .filter-row .field { min-width: 0; }
  .reprog-fields { grid-template-columns: 1fr; }
}
</style>
