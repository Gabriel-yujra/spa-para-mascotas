<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { groomingApi } from '@/api/groomingApi';
import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const router = useRouter();

// All citas returned by the API for the current filter
const allCitas = ref([]);
const loading  = ref(false);
const errorMsg = ref('');

// Filters
const filterModeFecha = ref('all');   // 'all' | 'day'
const selectedDate    = ref('');

// Pagination — frontend-only: /api/grooming/agenda does not support pagination params
const page  = ref(1);
const limit = ref(10);

const pagedAgenda = computed(() => {
  const start = (page.value - 1) * limit.value;
  return allCitas.value.slice(start, start + limit.value);
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

function formatHora(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function tamanoLabel(t) {
  const map = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande', gigante: 'Gigante' };
  return map[t] || t || '—';
}

async function loadAgenda() {
  loading.value  = true;
  errorMsg.value = '';
  page.value = 1;
  try {
    const params = {};
    if (filterModeFecha.value === 'day' && selectedDate.value) {
      params.fecha = selectedDate.value;
    }
    const data = await groomingApi.getAgenda(params);
    allCitas.value = data.agenda || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar la agenda';
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  loadAgenda();
}

function prevPage() {
  if (page.value > 1) page.value--;
}

function nextPage() {
  if (page.value * limit.value < allCitas.value.length) page.value++;
}

function verFicha(idCita) {
  router.push({ name: 'groomer-ficha', params: { idCita } });
}

onMounted(loadAgenda);
</script>

<template>
  <div class="agenda-page">
    <header class="page-header">
      <h2>📅 Mi agenda</h2>
      <p class="muted">Tus citas asignadas</p>
    </header>

    <AppCard variant="soft">
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
          <input type="date" v-model="selectedDate" class="date-input" />
        </div>

        <div class="filter-btn">
          <PrimaryButton @click="applyFilters" :loading="loading">Buscar</PrimaryButton>
        </div>
      </div>
    </AppCard>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <AppCard :title="`Citas (${allCitas.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!allCitas.length" class="state">
        No tienes citas asignadas para los filtros seleccionados.
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Mascota</th>
              <th>Tamaño</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Estado</th>
              <th>Ficha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cita in pagedAgenda" :key="cita.id_cita">
              <td><b>{{ formatHora(cita.hora_inicio) }}</b></td>
              <td>{{ cita.mascota_nombre || '—' }}</td>
              <td>{{ tamanoLabel(cita.mascota_tamano) }}</td>
              <td>{{ cita.cliente_nombre || '—' }}</td>
              <td>{{ cita.servicio_nombre || '—' }}</td>
              <td>
                <span class="badge" :class="estadoBadgeClass(cita.estado_global)">
                  {{ estadoLabel(cita.estado_global) }}
                </span>
              </td>
              <td>
                <span v-if="cita.tiene_ficha" class="badge badge-success">Creada</span>
                <span v-else class="badge badge-muted">Sin ficha</span>
              </td>
              <td>
                <button class="link-btn" @click="verFicha(cita.id_cita)">Ver ficha</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Pagination ──────────────────────────────────────── -->
      <div v-if="allCitas.length > limit" class="pagination">
        <button class="page-btn" @click="prevPage" :disabled="page === 1">← Anterior</button>
        <span class="page-info">Página {{ page }} de {{ Math.ceil(allCitas.length / limit) }}</span>
        <button class="page-btn" @click="nextPage" :disabled="page * limit >= allCitas.length">Siguiente →</button>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.agenda-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}
.filter-row .field { flex: 1; min-width: 130px; margin-bottom: 0; }
.filter-btn { flex-shrink: 0; padding-bottom: 0.05rem; }

.date-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.9rem;
  width: 100%;
}

.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.table-wrapper { overflow-x: auto; }

.link-btn {
  background: none;
  border: 1px solid var(--color-card-border);
  color: var(--color-primary-dark);
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.link-btn:hover { background: var(--color-primary-soft); }

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
}
</style>
