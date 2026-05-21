<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clienteApi } from '@/api/clienteApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const route  = useRoute();
const router = useRouter();

const cliente  = ref(null);
const mascotas = ref([]);
const loading  = ref(false);
const errorMsg = ref('');

const TAMANO_LABELS = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande:  'Grande',
  gigante: 'Gigante',
};

function tamanoLabel(t) { return TAMANO_LABELS[t] || t || '—'; }

async function loadDetalle() {
  loading.value  = true;
  errorMsg.value = '';
  try {
    const data = await clienteApi.getDetalleCliente(route.params.id);
    cliente.value  = data.cliente  || null;
    mascotas.value = data.mascotas || [];
  } catch (err) {
    if (err.response?.status === 404) {
      errorMsg.value = 'Cliente no encontrado.';
    } else {
      errorMsg.value = err.response?.data?.error || 'Error al cargar el cliente';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadDetalle);
</script>

<template>
  <div class="detalle-page">
    <div class="back-row">
      <button class="back-btn" @click="router.back()">← Volver</button>
    </div>

    <p v-if="loading" class="state-inline muted">Cargando…</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <template v-if="cliente">
      <!-- ── Datos del cliente ─────────────────────────────── -->
      <AppCard title="Datos del cliente">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Nombre</span>
            <span class="detail-value">{{ cliente.nombre || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email</span>
            <span class="detail-value">{{ cliente.email || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Teléfono</span>
            <span class="detail-value">{{ cliente.telefono || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">CI</span>
            <span class="detail-value">{{ cliente.ci || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Dirección</span>
            <span class="detail-value">{{ cliente.direccion || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Canal de notificación</span>
            <span class="detail-value">{{ cliente.canal_notificacion || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Estado de cuenta</span>
            <span
              class="badge"
              :class="{
                'badge-success': cliente.estado_usuario === 'activo',
                'badge-muted':   cliente.estado_usuario === 'inactivo',
                'badge-warning': cliente.estado_usuario === 'pendiente',
                'badge-danger':  cliente.estado_usuario === 'bloqueado',
              }"
            >
              {{ cliente.estado_usuario || '—' }}
            </span>
          </div>
        </div>
      </AppCard>

      <!-- ── Mascotas ─────────────────────────────────────── -->
      <AppCard :title="`Mascotas (${mascotas.length})`" no-padding>
        <div v-if="!mascotas.length" class="state">
          Este cliente no tiene mascotas registradas.
        </div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Especie / Raza</th>
                <th>Tamaño</th>
                <th>Temperamento</th>
                <th>Alergias</th>
                <th>Restricciones</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in mascotas" :key="m.id_mascota">
                <td><b>{{ m.nombre }}</b></td>
                <td>
                  <span v-if="m.especie || m.raza">
                    {{ [m.especie, m.raza].filter(Boolean).join(' / ') }}
                  </span>
                  <span v-else class="muted">—</span>
                </td>
                <td>{{ tamanoLabel(m.tamano) }}</td>
                <td>{{ m.temperamento || '—' }}</td>
                <td>
                  <span v-if="m.alergias" class="badge badge-warning">{{ m.alergias }}</span>
                  <span v-else class="muted">Ninguna</span>
                </td>
                <td>
                  <span v-if="m.restricciones" class="badge badge-warning">{{ m.restricciones }}</span>
                  <span v-else class="muted">Ninguna</span>
                </td>
                <td>{{ m.notas || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.detalle-page { display: flex; flex-direction: column; gap: 1.25rem; }

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

.state-inline { padding: 1rem 0; }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem 1.5rem;
}
.detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
.detail-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.detail-value { font-size: 0.95rem; color: var(--color-text); font-weight: 600; }

.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.table-wrapper { overflow-x: auto; }
</style>
