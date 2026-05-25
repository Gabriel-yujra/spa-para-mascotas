<script setup>
import { ref, onMounted } from 'vue';
import { opinionApi } from '@/api/opinionApi';
import AppCard from '@/components/AppCard.vue';

const resumen   = ref(null);
const recientes = ref([]);
const loading   = ref(false);
const errorMsg  = ref('');

async function load() {
  loading.value = true; errorMsg.value = '';
  try {
    const data = await opinionApi.getResumen();
    resumen.value   = data.resumen   || null;
    recientes.value = data.recientes || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar opiniones';
  } finally { loading.value = false; }
}

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function formatFecha(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('es-BO');
}

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2>Opiniones de clientes</h2>
      <p class="muted">Calificaciones y comentarios sobre los servicios</p>
    </header>

    <p v-if="errorMsg" class="msg-error">{{ errorMsg }}</p>
    <div v-if="loading" class="state">Cargando…</div>

    <template v-if="resumen && !loading">
      <!-- Resumen estadístico -->
      <div class="resumen-grid">
        <AppCard title="Total opiniones" variant="soft">
          <p class="big-num">{{ resumen.total_opiniones }}</p>
        </AppCard>
        <AppCard title="Promedio general" variant="soft">
          <p class="big-num">{{ resumen.promedio ?? '—' }} / 5</p>
          <p class="stars">{{ resumen.promedio ? stars(Math.round(resumen.promedio)) : '' }}</p>
        </AppCard>
      </div>

      <!-- Distribución por estrellas -->
      <AppCard title="Distribución">
        <div class="dist">
          <div v-for="(label, key) in { cinco_estrellas: '5 ★', cuatro_estrellas: '4 ★', tres_estrellas: '3 ★', dos_estrellas: '2 ★', una_estrella: '1 ★' }"
               :key="key" class="dist-row">
            <span class="dist-label">{{ label }}</span>
            <div class="dist-bar-wrap">
              <div class="dist-bar"
                   :style="{ width: resumen.total_opiniones > 0 ? (resumen[key] / resumen.total_opiniones * 100) + '%' : '0%' }" />
            </div>
            <span class="dist-count">{{ resumen[key] }}</span>
          </div>
        </div>
      </AppCard>

      <!-- Últimas opiniones -->
      <AppCard :title="`Últimas opiniones (${recientes.length})`" no-padding>
        <div v-if="!recientes.length" class="state">Sin opiniones aún.</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Fecha cita</th>
                <th>Calificación</th>
                <th>Comentario</th>
                <th>Opinó</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in recientes" :key="o.id_opinion">
                <td>{{ o.nombre_cliente }}</td>
                <td class="muted">{{ o.servicio_nombre }}</td>
                <td class="muted">{{ o.fecha_cita?.slice(0,10) }}</td>
                <td class="stars">{{ stars(o.calificacion) }}</td>
                <td class="muted">{{ o.comentario || '—' }}</td>
                <td class="muted">{{ formatFecha(o.fecha_opinion) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>

    <AppCard v-else-if="!loading && !resumen" title="Sin datos">
      <p class="muted">No hay opiniones registradas todavía.</p>
    </AppCard>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }
.muted { color: var(--color-text-soft); }

.resumen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.big-num { font-size: 2rem; font-weight: 700; margin: 0.5rem 0 0; }
.stars { color: #f59e0b; font-size: 1.1rem; }

.dist { display: flex; flex-direction: column; gap: 0.6rem; }
.dist-row { display: flex; align-items: center; gap: 0.75rem; }
.dist-label { width: 3rem; font-size: 0.9rem; color: var(--color-text-soft); }
.dist-bar-wrap { flex: 1; height: 10px; background: var(--color-bg-soft); border-radius: 999px; overflow: hidden; }
.dist-bar { height: 100%; background: #f59e0b; border-radius: 999px; transition: width .3s; }
.dist-count { width: 2rem; text-align: right; font-size: 0.85rem; color: var(--color-text-soft); }

.table-wrapper { overflow-x: auto; }
.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.msg-error { color: var(--color-danger); }
</style>
