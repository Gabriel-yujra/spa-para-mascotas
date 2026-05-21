<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { clienteApi } from '@/api/clienteApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const router = useRouter();

const clientes   = ref([]);
const loading    = ref(false);
const errorMsg   = ref('');

const filters = ref({
  nombre:   '',
  email:    '',
  ci:       '',
  telefono: '',
});

async function buscar() {
  loading.value  = true;
  errorMsg.value = '';
  try {
    const params = {};
    if (filters.value.nombre)   params.nombre   = filters.value.nombre;
    if (filters.value.email)    params.email    = filters.value.email;
    if (filters.value.ci)       params.ci       = filters.value.ci;
    if (filters.value.telefono) params.telefono = filters.value.telefono;
    const data = await clienteApi.buscarClientes(params);
    clientes.value = data.clientes || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al buscar clientes';
  } finally {
    loading.value = false;
  }
}

function limpiarFiltros() {
  filters.value = { nombre: '', email: '', ci: '', telefono: '' };
  buscar();
}

function verDetalle(idCliente) {
  router.push({ name: 'recepcion-cliente-detalle', params: { id: idCliente } });
}

onMounted(buscar);
</script>

<template>
  <div class="clientes-page">
    <header class="page-header">
      <h2>👤 Clientes</h2>
      <p class="muted">Busca y consulta los clientes registrados en Pet Spa</p>
    </header>

    <!-- ── Search bar ─────────────────────────────────────── -->
    <AppCard title="Buscar clientes" variant="soft">
      <div class="filter-grid">
        <div class="field">
          <label>Nombre</label>
          <input v-model="filters.nombre" placeholder="Ej. María..." @keyup.enter="buscar" />
        </div>
        <div class="field">
          <label>Email</label>
          <input v-model="filters.email" placeholder="Ej. maria@..." @keyup.enter="buscar" />
        </div>
        <div class="field">
          <label>CI</label>
          <input v-model="filters.ci" placeholder="Ej. 12345678..." @keyup.enter="buscar" />
        </div>
        <div class="field">
          <label>Teléfono</label>
          <input v-model="filters.telefono" placeholder="Ej. 71234567..." @keyup.enter="buscar" />
        </div>
      </div>
      <div class="filter-actions">
        <PrimaryButton @click="buscar" :loading="loading">Buscar</PrimaryButton>
        <PrimaryButton variant="ghost" @click="limpiarFiltros">Limpiar</PrimaryButton>
      </div>
    </AppCard>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <!-- ── Table ─────────────────────────────────────────── -->
    <AppCard :title="`Clientes (${clientes.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!clientes.length" class="state">
        No se encontraron clientes con esos filtros.
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>CI</th>
              <th>Mascotas</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in clientes" :key="c.id_cliente">
              <td><b>{{ c.nombre || '—' }}</b></td>
              <td>{{ c.email || '—' }}</td>
              <td>{{ c.telefono || '—' }}</td>
              <td>{{ c.ci || '—' }}</td>
              <td>
                <span class="badge">{{ c.total_mascotas ?? 0 }}</span>
              </td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'badge-success': c.estado_usuario === 'activo',
                    'badge-muted':   c.estado_usuario === 'inactivo',
                    'badge-warning': c.estado_usuario === 'pendiente',
                    'badge-danger':  c.estado_usuario === 'bloqueado',
                  }"
                >
                  {{ c.estado_usuario || '—' }}
                </span>
              </td>
              <td>
                <button class="link-btn" @click="verDetalle(c.id_cliente)">Ver detalle</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.clientes-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.filter-grid .field { margin-bottom: 0; }
.filter-actions { display: flex; gap: 0.6rem; margin-top: 0.85rem; }

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
</style>
