<script setup>
import { ref, onMounted } from 'vue';
import { agendaApi } from '@/api/agendaApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

// ── State ──────────────────────────────────────────────────────
const bloqueos   = ref([]);
const groomers   = ref([]);
const loading         = ref(false);
const submitting      = ref(false);
const deletingId      = ref(null);
const errorMsg        = ref('');
const successMsg      = ref('');
const errorConCitas   = ref(false);   // true cuando el 409 es por citas activas

// ── Filtros de búsqueda ────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

function getMonthEnd() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const filtroDesde = ref(today);
const filtroHasta = ref(getMonthEnd());

// ── Formulario de nuevo bloqueo ────────────────────────────────
const formFecha     = ref('');
const formTipo      = ref('feriado');
const formMotivo    = ref('');
const formGroomerId = ref('');

const TIPOS = [
  { value: 'feriado',       label: 'Feriado' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'ausencia',      label: 'Ausencia' },
];

// ── Helpers ────────────────────────────────────────────────────
function formatFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function tipoLabel(t) {
  return TIPOS.find((x) => x.value === t)?.label || t;
}

function tipoBadgeClass(t) {
  if (t === 'feriado')       return 'badge-warning';
  if (t === 'mantenimiento') return '';
  if (t === 'ausencia')      return 'badge-danger';
  return '';
}

// ── Cargar bloqueos ────────────────────────────────────────────
async function loadBloqueos() {
  if (!filtroDesde.value || !filtroHasta.value) return;
  loading.value  = true;
  errorMsg.value = '';
  try {
    const data = await agendaApi.listarBloqueos({
      desde: filtroDesde.value,
      hasta: filtroHasta.value,
    });
    bloqueos.value = data.bloqueos || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar bloqueos';
  } finally {
    loading.value = false;
  }
}

// ── Cargar lista de groomers ───────────────────────────────────
async function loadGroomers() {
  try {
    const data = await agendaApi.listarGrromers();
    groomers.value = data.groomers || [];
  } catch {
    groomers.value = [];
  }
}

// ── Crear bloqueo ──────────────────────────────────────────────
async function doCrear() {
  errorMsg.value     = '';
  successMsg.value   = '';
  errorConCitas.value = false;
  if (!formFecha.value) { errorMsg.value = 'La fecha es obligatoria'; return; }
  if (!formTipo.value)  { errorMsg.value = 'El tipo es obligatorio'; return; }

  submitting.value = true;
  try {
    const payload = {
      fecha:  formFecha.value,
      tipo:   formTipo.value,
      motivo: formMotivo.value.trim() || null,
    };
    if (formGroomerId.value) payload.id_trabajador = formGroomerId.value;

    await agendaApi.crearBloqueo(payload);
    successMsg.value = '✅ Bloqueo registrado correctamente';

    formFecha.value     = '';
    formMotivo.value    = '';
    formGroomerId.value = '';
    formTipo.value      = 'feriado';

    await loadBloqueos();
  } catch (err) {
    const status = err.response?.status;
    errorMsg.value = err.response?.data?.error || 'Error al crear el bloqueo';
    if (status === 409 && err.response?.data?.citas_activas) {
      errorConCitas.value = true;
    }
  } finally {
    submitting.value = false;
  }
}

// ── Eliminar bloqueo ───────────────────────────────────────────
async function doEliminar(id) {
  errorMsg.value   = '';
  successMsg.value = '';
  deletingId.value = id;
  try {
    await agendaApi.eliminarBloqueo(id);
    successMsg.value = '✅ Bloqueo eliminado';
    bloqueos.value = bloqueos.value.filter((b) => b.id_bloqueo !== id);
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al eliminar el bloqueo';
  } finally {
    deletingId.value = null;
  }
}

onMounted(() => {
  loadBloqueos();
  loadGroomers();
});
</script>

<template>
  <div class="bloqueos-page">
    <header class="page-header">
      <h2>🚫 Bloqueos de agenda</h2>
      <p class="muted">Gestiona feriados, mantenimientos y ausencias de groomers</p>
    </header>

    <!-- ── Feedback ────────────────────────────────────────────── -->
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <div v-if="errorConCitas" class="citas-hint">
      <b>¿Cómo proceder?</b> Ve a la
      <router-link to="/recepcion/citas">bandeja de citas</router-link>
      y reprograma o cancela las citas de ese día antes de registrar el bloqueo.
    </div>
    <p v-if="successMsg" class="success">{{ successMsg }}</p>

    <!-- ── Filtros de búsqueda ─────────────────────────────────── -->
    <AppCard title="Filtrar bloqueos" variant="soft">
      <div class="filter-row">
        <div class="field">
          <label>Desde</label>
          <input type="date" v-model="filtroDesde" />
        </div>
        <div class="field">
          <label>Hasta</label>
          <input type="date" v-model="filtroHasta" />
        </div>
        <div class="filter-btn">
          <PrimaryButton @click="loadBloqueos" :loading="loading">Buscar</PrimaryButton>
        </div>
      </div>
    </AppCard>

    <!-- ── Tabla de bloqueos ────────────────────────────────────── -->
    <AppCard :title="`Bloqueos (${bloqueos.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!bloqueos.length" class="state">
        No hay bloqueos registrados para ese rango de fechas.
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Groomer</th>
              <th>Motivo</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in bloqueos" :key="b.id_bloqueo">
              <td><b>{{ formatFecha(b.fecha) }}</b></td>
              <td>
                <span class="badge" :class="tipoBadgeClass(b.tipo)">
                  {{ tipoLabel(b.tipo) }}
                </span>
              </td>
              <td>{{ b.nombre_trabajador || 'Todos (global)' }}</td>
              <td class="motivo-cell">{{ b.motivo || '—' }}</td>
              <td>
                <button
                  class="link-btn danger"
                  :disabled="deletingId === b.id_bloqueo"
                  @click="doEliminar(b.id_bloqueo)"
                >
                  {{ deletingId === b.id_bloqueo ? '…' : 'Eliminar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <!-- ── Crear nuevo bloqueo ─────────────────────────────────── -->
    <AppCard title="Registrar nuevo bloqueo">
      <div class="form-grid">
        <div class="field">
          <label>Fecha <span class="required">*</span></label>
          <input type="date" v-model="formFecha" />
        </div>

        <div class="field">
          <label>Tipo <span class="required">*</span></label>
          <select v-model="formTipo">
            <option v-for="t in TIPOS" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Groomer afectado</label>
          <select v-model="formGroomerId">
            <option value="">Todos (bloqueo global)</option>
            <option
              v-for="g in groomers"
              :key="g.id_trabajador"
              :value="g.id_trabajador"
            >
              {{ g.nombre_usuario }}{{ g.especialidad ? ` · ${g.especialidad}` : '' }}
            </option>
          </select>
          <small class="muted">
            Dejar en "Todos" para cerrar el spa completo ese día.
          </small>
        </div>

        <div class="field field--wide">
          <label>Motivo</label>
          <input
            v-model="formMotivo"
            type="text"
            placeholder="Ej: Feriado nacional, mantenimiento de instalaciones…"
          />
        </div>
      </div>

      <div class="form-actions">
        <PrimaryButton :loading="submitting" @click="doCrear">
          {{ submitting ? 'Guardando…' : 'Registrar bloqueo' }}
        </PrimaryButton>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.bloqueos-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}
.filter-row .field { flex: 1; min-width: 130px; margin-bottom: 0; }
.filter-btn { flex-shrink: 0; }

.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.table-wrapper { overflow-x: auto; }

.motivo-cell { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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
.link-btn.danger { border-color: var(--color-danger); color: var(--color-danger); }
.link-btn.danger:hover:not(:disabled) { background: #fee2e2; }
.link-btn:disabled { opacity: 0.5; cursor: default; }

.citas-hint {
  padding: 0.7rem 1rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: #92400e;
}
.citas-hint a { color: #b45309; font-weight: 600; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}
.field--wide { grid-column: 1 / -1; }

.form-actions { margin-top: 0.75rem; }

.required { color: var(--color-danger); }

@media (max-width: 640px) {
  .filter-row { flex-direction: column; }
  .filter-row .field { min-width: 0; }
}
</style>
