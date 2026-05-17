<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { auditApi } from '@/api/auditApi';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

// Acciones conocidas del backend (ajusta si añades más)
const ACTIONS = [
  '', // todas
  'login',
  'login_fallido',
  'login_bloqueado',
  'login_2fa_pendiente',
  'login_2fa_ok',
  'cuenta_bloqueada',
  'registro_cliente',
  'activacion_cuenta',
  'cambio_password',
  'cambio_password_fallido',
  'crear_empleado',
  'actualizar_empleado',
  'cambio_estado_usuario',
  '2fa_setup',
  '2fa_habilitado',
  '2fa_deshabilitado',
  'desactivacion_automatica',
];

const filters = reactive({
  from: '',
  to: '',
  accion: '',
  id_usuario: '',
  page: 1,
  pageSize: 25,
});

const loading = ref(false);
const errorMsg = ref('');
const items = ref([]);
const meta = ref({ page: 1, pageSize: 25, total: 0, totalPages: 0 });

const exporting = ref(false);

const hasItems = computed(() => items.value.length > 0);

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await auditApi.listLogs({
      from: filters.from ? new Date(filters.from).toISOString() : '',
      to: filters.to ? new Date(filters.to).toISOString() : '',
      accion: filters.accion,
      id_usuario: filters.id_usuario,
      page: filters.page,
      pageSize: filters.pageSize,
    });
    items.value = data.items || [];
    meta.value = {
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
      totalPages: data.totalPages,
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar logs';
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  filters.page = 1;
  load();
}

function clearFilters() {
  filters.from = '';
  filters.to = '';
  filters.accion = '';
  filters.id_usuario = '';
  filters.page = 1;
  load();
}

function goPage(p) {
  if (p < 1 || p > meta.value.totalPages) return;
  filters.page = p;
  load();
}

function shortUA(ua) {
  if (!ua) return '-';
  return ua.length > 60 ? ua.slice(0, 60) + '…' : ua;
}

function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function actionBadgeClass(a) {
  if (!a) return 'badge-muted';
  if (a.includes('fallido') || a.includes('bloque') || a.includes('desactiv')) return 'badge-danger';
  if (a.includes('2fa') || a.includes('login_2fa_ok') || a === 'activacion_cuenta' || a === 'cambio_password') return 'badge-success';
  if (a.includes('crear') || a.includes('actualizar') || a.includes('cambio_estado')) return 'badge-warning';
  return '';
}

// ===== Export =====
async function downloadJSON() {
  exporting.value = true;
  try {
    const data = await auditApi.exportLogs({
      from: filters.from ? new Date(filters.from).toISOString() : '',
      to: filters.to ? new Date(filters.to).toISOString() : '',
      accion: filters.accion,
      id_usuario: filters.id_usuario,
    });
    triggerDownload(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      `auditoria_${Date.now()}.json`
    );
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al exportar';
  } finally {
    exporting.value = false;
  }
}

async function downloadCSV() {
  exporting.value = true;
  try {
    const data = await auditApi.exportLogs({
      from: filters.from ? new Date(filters.from).toISOString() : '',
      to: filters.to ? new Date(filters.to).toISOString() : '',
      accion: filters.accion,
      id_usuario: filters.id_usuario,
    });
    const csv = toCSV(data.items || []);
    triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `auditoria_${Date.now()}.csv`
    );
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al exportar';
  } finally {
    exporting.value = false;
  }
}

function toCSV(rows) {
  const header = ['fecha', 'accion', 'detalle', 'nombre_usuario', 'email_usuario', 'nombre_rol', 'ip_address', 'user_agent'];
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map((k) => escape(r[k])).join(','));
  }
  return lines.join('\n');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

onMounted(load);
</script>

<template>
  <div class="audit-page">
    <header class="header">
      <div>
        <h2>📋 Auditoría</h2>
        <p class="muted">Registros de actividad del sistema</p>
      </div>
      <div class="export-actions">
        <PrimaryButton variant="ghost" size="sm" :loading="exporting" @click="downloadCSV">
          ⬇️ Exportar CSV
        </PrimaryButton>
        <PrimaryButton variant="ghost" size="sm" :loading="exporting" @click="downloadJSON">
          ⬇️ Exportar JSON
        </PrimaryButton>
      </div>
    </header>

    <!-- Filtros -->
    <AppCard title="Filtros" variant="soft">
      <div class="filters-grid">
        <div class="field">
          <label>Desde</label>
          <input v-model="filters.from" type="datetime-local" />
        </div>
        <div class="field">
          <label>Hasta</label>
          <input v-model="filters.to" type="datetime-local" />
        </div>
        <div class="field">
          <label>Acción</label>
          <select v-model="filters.accion">
            <option v-for="a in ACTIONS" :key="a" :value="a">
              {{ a || 'Todas' }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>ID de usuario (UUID)</label>
          <input v-model="filters.id_usuario" type="text" placeholder="opcional" />
        </div>
      </div>
      <div class="actions-row">
        <PrimaryButton @click="applyFilters" size="md">Aplicar filtros</PrimaryButton>
        <PrimaryButton variant="ghost" @click="clearFilters" size="md">Limpiar</PrimaryButton>
      </div>
    </AppCard>

    <!-- Tabla -->
    <AppCard no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="errorMsg" class="state error-state">{{ errorMsg }}</div>
      <div v-else-if="!hasItems" class="state">Sin resultados</div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acción</th>
              <th>Detalle</th>
              <th>IP</th>
              <th>Navegador</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in items" :key="row.id_log">
              <td>{{ fmtDate(row.fecha) }}</td>
              <td>{{ row.nombre_usuario || '—' }}</td>
              <td>
                <span v-if="row.nombre_rol" class="badge" :class="`role-${row.nombre_rol}`">
                  {{ row.nombre_rol }}
                </span>
                <span v-else>—</span>
              </td>
              <td>
                <span class="badge" :class="actionBadgeClass(row.accion)">
                  {{ row.accion }}
                </span>
              </td>
              <td class="detail-cell">{{ row.detalle || '—' }}</td>
              <td>{{ row.ip_address || '—' }}</td>
              <td :title="row.user_agent">{{ shortUA(row.user_agent) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="hasItems" class="pagination">
        <span class="muted">
          Página {{ meta.page }} de {{ meta.totalPages }} · {{ meta.total }} registros
        </span>
        <div class="pager-buttons">
          <PrimaryButton
            variant="ghost" size="sm"
            :disabled="meta.page <= 1"
            @click="goPage(meta.page - 1)"
          >
            ← Anterior
          </PrimaryButton>
          <PrimaryButton
            variant="ghost" size="sm"
            :disabled="meta.page >= meta.totalPages"
            @click="goPage(meta.page + 1)"
          >
            Siguiente →
          </PrimaryButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.audit-page { display: flex; flex-direction: column; gap: 1.25rem; }
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.header h2 { margin: 0; }
.export-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.actions-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
  flex-wrap: wrap;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-lg);
}
.detail-cell {
  max-width: 320px;
  white-space: normal;
  font-size: 0.85rem;
  color: var(--color-text-soft);
}

.state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-soft);
}
.error-state { color: var(--color-danger); }

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--color-card-border);
  flex-wrap: wrap;
}
.pager-buttons { display: flex; gap: 0.4rem; }

.role-admin       { background: #fee2e2; color: #991b1b; }
.role-jefe        { background: #fef3c7; color: #92400e; }
.role-trabajador  { background: #d1fae5; color: #065f46; }
.role-cliente     { background: var(--color-primary-soft); color: var(--color-primary-dark); }
</style>
