<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/store/authStore';
import { ROLES, isAdminLike } from '@/utils/roles';
import { cajaApi } from '@/api/cajaApi';
import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const auth = useAuthStore();

const caja           = ref(null);
const resumen        = ref(null);
const transacciones  = ref([]);
const loading        = ref(false);
const errorMsg       = ref('');
const successMsg     = ref('');
const saving         = ref(false);

// Abrir caja
const formAbrir = ref({ nombre: '', descripcion: '' });
const showAbrirForm = ref(false);

// Nueva transacción
const formTx = ref({ tipo: 'INGRESO', monto: '', descripcion: '' });
const showTxForm = ref(false);

const puedeAdministrar = computed(() => isAdminLike(auth.role));
const saldo = computed(() => caja.value ? Number(caja.value.saldo_actual).toFixed(2) : '0.00');

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await cajaApi.getCajaActual();
    caja.value          = data.caja          || null;
    resumen.value       = data.resumen        || null;
    transacciones.value = data.transacciones  || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar caja';
  } finally {
    loading.value = false;
  }
}

async function abrirCaja() {
  if (!formAbrir.value.nombre.trim()) { errorMsg.value = 'El nombre es requerido'; return; }
  saving.value = true; errorMsg.value = '';
  try {
    await cajaApi.abrirCaja(formAbrir.value);
    successMsg.value = 'Caja abierta';
    showAbrirForm.value = false;
    formAbrir.value = { nombre: '', descripcion: '' };
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al abrir caja';
  } finally { saving.value = false; }
}

async function cerrarCaja() {
  if (!confirm('¿Cerrar la caja actual? Esta acción no se puede deshacer.')) return;
  saving.value = true; errorMsg.value = '';
  try {
    await cajaApi.cerrarCaja(caja.value.id_caja);
    successMsg.value = 'Caja cerrada';
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cerrar caja';
  } finally { saving.value = false; }
}

async function crearTransaccion() {
  if (!formTx.value.monto || parseFloat(formTx.value.monto) <= 0) {
    errorMsg.value = 'El monto debe ser mayor a 0'; return;
  }
  saving.value = true; errorMsg.value = '';
  try {
    await cajaApi.crearTransaccion({
      tipo: formTx.value.tipo,
      monto: parseFloat(formTx.value.monto),
      descripcion: formTx.value.descripcion,
    });
    successMsg.value = 'Transacción registrada';
    showTxForm.value = false;
    formTx.value = { tipo: 'INGRESO', monto: '', descripcion: '' };
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al registrar transacción';
  } finally { saving.value = false; }
}

function formatFecha(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2>Caja</h2>
      <p class="muted">Ingresos, egresos y saldo de la caja activa</p>
    </header>

    <p v-if="errorMsg"   class="msg-error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="msg-ok">{{ successMsg }}</p>

    <!-- Sin caja activa -->
    <AppCard v-if="!loading && !caja" title="Sin caja activa">
      <p class="muted">No hay ninguna caja abierta.</p>
      <div v-if="!showAbrirForm" style="margin-top:1rem">
        <PrimaryButton @click="showAbrirForm = true">Abrir nueva caja</PrimaryButton>
      </div>
      <div v-else class="abrir-form">
        <div class="field"><label>Nombre *</label><input v-model="formAbrir.nombre" placeholder="Caja del día..." /></div>
        <div class="field"><label>Descripción</label><input v-model="formAbrir.descripcion" placeholder="Opcional" /></div>
        <div class="row-btns">
          <PrimaryButton :loading="saving" @click="abrirCaja">Confirmar apertura</PrimaryButton>
          <PrimaryButton variant="ghost" @click="showAbrirForm = false">Cancelar</PrimaryButton>
        </div>
      </div>
    </AppCard>

    <!-- Caja activa -->
    <template v-if="caja">
      <!-- Resumen -->
      <div class="resumen-grid">
        <AppCard title="Ingresos" variant="soft">
          <p class="amount green">Bs {{ Number(resumen?.total_ingresos || 0).toFixed(2) }}</p>
        </AppCard>
        <AppCard title="Egresos" variant="soft">
          <p class="amount red">Bs {{ Number(resumen?.total_egresos || 0).toFixed(2) }}</p>
        </AppCard>
        <AppCard title="Saldo actual" variant="soft">
          <p class="amount">Bs {{ saldo }}</p>
        </AppCard>
      </div>

      <!-- Acciones -->
      <div class="top-actions">
        <PrimaryButton @click="showTxForm = !showTxForm">+ Registrar movimiento</PrimaryButton>
        <PrimaryButton v-if="puedeAdministrar" variant="ghost" :loading="saving" @click="cerrarCaja">
          Cerrar caja
        </PrimaryButton>
      </div>

      <!-- Formulario transacción -->
      <div v-if="showTxForm" class="tx-form card-form">
        <h4 style="margin:0">Nuevo movimiento</h4>
        <div class="row2">
          <div class="field">
            <label>Tipo</label>
            <select v-model="formTx.tipo">
              <option value="INGRESO">Ingreso</option>
              <option value="EGRESO">Egreso</option>
            </select>
          </div>
          <div class="field">
            <label>Monto (Bs) *</label>
            <input v-model.number="formTx.monto" type="number" min="0.01" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <div class="field">
          <label>Descripción</label>
          <input v-model="formTx.descripcion" placeholder="Cobro servicio, compra insumo..." />
        </div>
        <div class="row-btns">
          <PrimaryButton :loading="saving" @click="crearTransaccion">Guardar</PrimaryButton>
          <PrimaryButton variant="ghost" @click="showTxForm = false">Cancelar</PrimaryButton>
        </div>
      </div>

      <!-- Movimientos -->
      <AppCard :title="`Movimientos (${transacciones.length})`" no-padding>
        <div v-if="loading" class="state">Cargando…</div>
        <div v-else-if="!transacciones.length" class="state">Sin movimientos registrados.</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Descripción</th>
                <th>Usuario</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in transacciones" :key="t.id_transaccion">
                <td>
                  <span class="badge" :class="t.tipo === 'INGRESO' ? 'badge-success' : 'badge-danger'">
                    {{ t.tipo }}
                  </span>
                </td>
                <td :class="t.tipo === 'INGRESO' ? 'green' : 'red'">
                  {{ t.tipo === 'INGRESO' ? '+' : '-' }}Bs {{ Number(t.monto).toFixed(2) }}
                </td>
                <td class="muted">{{ t.descripcion || '—' }}</td>
                <td>{{ t.nombre_usuario || '—' }}</td>
                <td class="muted">{{ formatFecha(t.fecha_solicitud) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>

    <div v-if="loading" class="state">Cargando caja…</div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }
.muted { color: var(--color-text-soft); }
.top-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.resumen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.amount { font-size: 1.6rem; font-weight: 700; margin: 0.5rem 0 0; }
.green { color: #16a34a; }
.red   { color: var(--color-danger); }

.abrir-form, .card-form {
  display: flex; flex-direction: column; gap: 1rem;
  background: #fff; border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg); padding: 1.25rem;
}
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.row-btns { display: flex; gap: 0.75rem; }

.table-wrapper { overflow-x: auto; }
.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }

.msg-error { color: var(--color-danger); }
.msg-ok    { color: #16a34a; }
</style>
