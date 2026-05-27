<script setup>
import { ref, onMounted } from 'vue';
import { reportesApi } from '@/api/reportesApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

// Default range: last 30 days
function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function iso30DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

const desde = ref(iso30DaysAgo());
const hasta = ref(isoToday());

const ingresos          = ref([]);
const topServicios      = ref([]);
const porGroomer        = ref([]);
const consumoElevado    = ref([]);
const loading           = ref(false);
const errorMsg          = ref('');

const totalPeriodo = () =>
  ingresos.value.reduce((s, r) => s + parseFloat(r.total || 0), 0).toFixed(2);

async function cargar() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const params = { desde: desde.value, hasta: hasta.value };
    const [r1, r2, r3, r4] = await Promise.all([
      reportesApi.getIngresosDiarios(params),
      reportesApi.getTopServicios(params),
      reportesApi.getServiciosPorGroomer(params),
      reportesApi.getConsumoElevado(params),
    ]);
    ingresos.value       = r1.datos || [];
    topServicios.value   = r2.datos || [];
    porGroomer.value     = r3.datos || [];
    consumoElevado.value = r4.datos || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar reportes';
  } finally {
    loading.value = false;
  }
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

onMounted(cargar);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2>Reportes</h2>
      <p class="muted">Resumen de ingresos, servicios y groomers</p>
    </header>

    <!-- Filtro de fechas -->
    <div class="filtro-bar">
      <div class="field-inline">
        <label>Desde</label>
        <input type="date" v-model="desde" />
      </div>
      <div class="field-inline">
        <label>Hasta</label>
        <input type="date" v-model="hasta" />
      </div>
      <PrimaryButton :loading="loading" @click="cargar">Aplicar</PrimaryButton>
    </div>

    <p v-if="errorMsg" class="msg-error">{{ errorMsg }}</p>
    <p v-if="loading"  class="muted center">Cargando reportes…</p>

    <template v-if="!loading">
      <!-- Ingresos por día -->
      <AppCard :title="`Ingresos diarios — Total período: Bs ${totalPeriodo()}`" no-padding>
        <div v-if="!ingresos.length" class="state">Sin ingresos en el período.</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cantidad de transacciones</th>
                <th>Total (Bs)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in ingresos" :key="r.fecha">
                <td>{{ formatFecha(r.fecha) }}</td>
                <td class="center">{{ r.cantidad }}</td>
                <td class="amount">Bs {{ Number(r.total).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Top servicios -->
      <AppCard title="Servicios más solicitados (citas completadas)" no-padding>
        <div v-if="!topServicios.length" class="state">Sin citas completadas en el período.</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Servicio</th>
                <th>Citas completadas</th>
                <th>Ingresos estimados (Bs)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in topServicios" :key="s.servicio_nombre">
                <td class="muted">{{ idx + 1 }}</td>
                <td>{{ s.servicio_nombre }}</td>
                <td class="center"><span class="badge badge-success">{{ s.cantidad }}</span></td>
                <td class="amount">Bs {{ Number(s.ingresos_estimados).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Por groomer -->
      <AppCard title="Citas por groomer" no-padding>
        <div v-if="!porGroomer.length" class="state">Sin citas asignadas en el período.</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Groomer</th>
                <th>Completadas</th>
                <th>En progreso</th>
                <th>Total asignadas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in porGroomer" :key="g.groomer_nombre">
                <td>{{ g.groomer_nombre }}</td>
                <td class="center"><span class="badge badge-success">{{ g.completadas }}</span></td>
                <td class="center"><span class="badge badge-warning">{{ g.en_progreso }}</span></td>
                <td class="center">{{ g.total_asignadas }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <!-- Consumo elevado de insumos -->
      <AppCard no-padding>
        <template #header>
          <div class="consumo-elevado-header">
            <span class="consumo-elevado-title">⚠ Fichas con consumo elevado de insumos</span>
            <span class="consumo-elevado-count" v-if="consumoElevado.length">{{ consumoElevado.length }}</span>
          </div>
        </template>
        <div v-if="!consumoElevado.length" class="state">Sin registros de consumo elevado en el período.</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Groomer</th>
                <th>Servicio</th>
                <th>Mascota</th>
                <th>Tamaño</th>
                <th class="center">Unidades usadas</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in consumoElevado" :key="`${r.fecha_cita}-${r.mascota_nombre}`" class="consumo-elevado-row">
                <td>{{ formatFecha(r.fecha_cita) }}</td>
                <td>{{ r.groomer_nombre || '—' }}</td>
                <td>{{ r.servicio_nombre }}</td>
                <td>{{ r.mascota_nombre }}</td>
                <td>{{ r.tamano_verificado || r.tamano_mascota || '—' }}</td>
                <td class="center amount-warn">{{ Number(r.total_unidades_usadas).toFixed(1) }}</td>
                <td class="motivo-cell">
                  <span v-if="r.motivo_consumo_elevado">{{ r.motivo_consumo_elevado }}</span>
                  <span v-else class="muted badge badge-warning">Sin justificación</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem; }
.muted { color: var(--color-text-soft); }
.center { text-align: center; }
.msg-error { color: var(--color-danger); }

.filtro-bar {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
  background: #fff;
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
}
.field-inline { display: flex; flex-direction: column; gap: 0.25rem; }
.field-inline label { font-size: 0.8rem; font-weight: 700; color: var(--color-text-soft); }

.table-wrapper { overflow-x: auto; }
.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.amount { font-weight: 700; color: #16a34a; }
.amount-warn { font-weight: 700; color: #c2410c; }

/* ── Consumo elevado ── */
.consumo-elevado-header { display: flex; align-items: center; gap: 0.5rem; }
.consumo-elevado-title { font-weight: 800; color: #9a3412; font-size: 1.1rem; }
.consumo-elevado-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fb923c;
  color: #fff;
  font-weight: 800;
  font-size: 0.75rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  margin-left: 0.5rem;
}
.consumo-elevado-row { background: #fff7ed; }
.consumo-elevado-row:hover { background: #ffedd5; }
.motivo-cell {
  max-width: 280px;
  font-size: 0.88rem;
  white-space: normal;
  word-break: break-word;
}
</style>
