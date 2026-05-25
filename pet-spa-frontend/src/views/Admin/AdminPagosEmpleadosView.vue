<script setup>
import { ref, onMounted } from 'vue';
import { employeeApi } from '@/api/employeeApi';
import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import http from '@/api/http';

const empleados      = ref([]);
const pagos          = ref([]);
const loading        = ref(false);
const errorMsg       = ref('');
const successMsg     = ref('');
const saving         = ref(false);
const showForm       = ref(false);

const form = ref({
  id_trabajador: '',
  monto: '',
  periodo_desde: '',
  periodo_hasta: '',
  descripcion: '',
});

async function load() {
  loading.value = true; errorMsg.value = '';
  try {
    const [empData, pagosData] = await Promise.all([
      employeeApi.list(),
      http.get('/pagos-empleados').then((r) => r.data),
    ]);
    empleados.value = empData.employees || empData.empleados || [];
    pagos.value     = pagosData.pagos   || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar datos';
  } finally { loading.value = false; }
}

async function registrarPago() {
  const { id_trabajador, monto, periodo_desde, periodo_hasta } = form.value;
  if (!id_trabajador || !monto || !periodo_desde || !periodo_hasta) {
    errorMsg.value = 'Todos los campos marcados con * son requeridos'; return;
  }
  if (parseFloat(monto) <= 0) { errorMsg.value = 'El monto debe ser mayor a 0'; return; }

  saving.value = true; errorMsg.value = '';
  try {
    await http.post('/pagos-empleados', {
      id_trabajador,
      monto: parseFloat(monto),
      periodo_desde,
      periodo_hasta,
      descripcion: form.value.descripcion,
    });
    successMsg.value = 'Pago registrado correctamente';
    showForm.value = false;
    form.value = { id_trabajador: '', monto: '', periodo_desde: '', periodo_hasta: '', descripcion: '' };
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al registrar pago';
  } finally { saving.value = false; }
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
      <h2>Pagos a empleados</h2>
      <p class="muted">Registra pagos de nómina y períodos laborados</p>
    </header>

    <p v-if="errorMsg"   class="msg-error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="msg-ok">{{ successMsg }}</p>

    <div class="top-actions">
      <PrimaryButton @click="showForm = !showForm">+ Registrar pago</PrimaryButton>
    </div>

    <!-- Formulario -->
    <div v-if="showForm" class="card-form">
      <h4 style="margin:0">Nuevo pago</h4>
      <div class="field">
        <label>Empleado *</label>
        <select v-model="form.id_trabajador">
          <option value="">— seleccionar —</option>
          <option v-for="e in empleados" :key="e.id_trabajador" :value="e.id_trabajador">
            {{ e.nombre }} ({{ e.rol_name }})
          </option>
        </select>
      </div>
      <div class="row2">
        <div class="field">
          <label>Período desde *</label>
          <input v-model="form.periodo_desde" type="date" />
        </div>
        <div class="field">
          <label>Período hasta *</label>
          <input v-model="form.periodo_hasta" type="date" />
        </div>
      </div>
      <div class="field">
        <label>Monto (Bs) *</label>
        <input v-model.number="form.monto" type="number" min="0.01" step="0.01" placeholder="0.00" />
      </div>
      <div class="field">
        <label>Descripción</label>
        <input v-model="form.descripcion" placeholder="Sueldo quincenal, bono..." />
      </div>
      <div class="row-btns">
        <PrimaryButton :loading="saving" @click="registrarPago">Confirmar pago</PrimaryButton>
        <PrimaryButton variant="ghost" @click="showForm = false">Cancelar</PrimaryButton>
      </div>
    </div>

    <!-- Historial -->
    <AppCard :title="`Historial de pagos (${pagos.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!pagos.length" class="state">Sin pagos registrados.</div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Período</th>
              <th>Monto</th>
              <th>Descripción</th>
              <th>Fecha pago</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pagos" :key="p.id_pago">
              <td><b>{{ p.nombre_trabajador }}</b></td>
              <td class="muted">{{ p.periodo_desde?.slice(0,10) }} → {{ p.periodo_hasta?.slice(0,10) }}</td>
              <td class="red">Bs {{ Number(p.monto).toFixed(2) }}</td>
              <td class="muted">{{ p.descripcion || '—' }}</td>
              <td class="muted">{{ formatFecha(p.fecha_pago) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem 0; }
.muted { color: var(--color-text-soft); }
.top-actions { display: flex; gap: 0.75rem; }
.red { color: var(--color-danger); font-weight: 600; }

.card-form {
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
