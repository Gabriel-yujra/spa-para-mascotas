<script setup>
import { ref, onMounted } from 'vue';
import { servicioApi } from '@/api/servicioApi';
import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const servicios  = ref([]);
const loading    = ref(false);
const errorMsg   = ref('');
const successMsg = ref('');

const showForm   = ref(false);
const editando   = ref(null);  // null = crear; objeto = editar

const form = ref({ nombre: '', descripcion: '', duracion_estimada_min: 30, precio: 0, permite_doble_booking: false });
const saving = ref(false);

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await servicioApi.getServiciosAdmin();
    servicios.value = data.servicios || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar servicios';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editando.value = null;
  form.value = { nombre: '', descripcion: '', duracion_estimada_min: 30, precio: 0, permite_doble_booking: false };
  showForm.value = true;
  errorMsg.value = '';
  successMsg.value = '';
}

function openEdit(s) {
  editando.value = s;
  form.value = {
    nombre: s.nombre,
    descripcion: s.descripcion || '',
    duracion_estimada_min: s.duracion_estimada_min,
    precio: s.precio,
    permite_doble_booking: s.permite_doble_booking,
  };
  showForm.value = true;
  errorMsg.value = '';
  successMsg.value = '';
}

function cancelForm() {
  showForm.value = false;
  editando.value = null;
}

async function saveForm() {
  saving.value = true;
  errorMsg.value = '';
  try {
    if (editando.value) {
      await servicioApi.updateServicio(editando.value.id_servicio, form.value);
      successMsg.value = 'Servicio actualizado';
    } else {
      await servicioApi.createServicio(form.value);
      successMsg.value = 'Servicio creado';
    }
    showForm.value = false;
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

async function toggleEstado(s) {
  errorMsg.value = '';
  try {
    await servicioApi.updateServicioEstado(s.id_servicio, !s.activo);
    successMsg.value = `Servicio ${!s.activo ? 'activado' : 'desactivado'}`;
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cambiar estado';
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2>Administración de servicios</h2>
      <p class="muted">Crea, edita y activa/desactiva los servicios del spa</p>
    </header>

    <p v-if="errorMsg"   class="msg-error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="msg-ok">{{ successMsg }}</p>

    <div class="top-actions">
      <PrimaryButton @click="openCreate">+ Nuevo servicio</PrimaryButton>
    </div>

    <!-- Formulario -->
    <div v-if="showForm" class="modal-overlay" @click.self="cancelForm">
      <div class="modal">
        <h3>{{ editando ? 'Editar servicio' : 'Nuevo servicio' }}</h3>
        <div class="field">
          <label>Nombre *</label>
          <input v-model="form.nombre" placeholder="Baño completo..." />
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea v-model="form.descripcion" rows="2" placeholder="Opcional..." />
        </div>
        <div class="row2">
          <div class="field">
            <label>Duración (min) *</label>
            <input v-model.number="form.duracion_estimada_min" type="number" min="1" />
          </div>
          <div class="field">
            <label>Precio *</label>
            <input v-model.number="form.precio" type="number" min="0" step="0.01" />
          </div>
        </div>
        <div class="field check-field">
          <input id="doble" v-model="form.permite_doble_booking" type="checkbox" />
          <label for="doble">Permite doble booking</label>
        </div>
        <div class="modal-actions">
          <PrimaryButton :loading="saving" @click="saveForm">Guardar</PrimaryButton>
          <PrimaryButton variant="ghost" @click="cancelForm">Cancelar</PrimaryButton>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <AppCard title="Servicios" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!servicios.length" class="state">Sin servicios. Crea el primero.</div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Duración</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in servicios" :key="s.id_servicio">
              <td><b>{{ s.nombre }}</b></td>
              <td class="muted">{{ s.descripcion || '—' }}</td>
              <td>{{ s.duracion_estimada_min }} min</td>
              <td>Bs {{ Number(s.precio).toFixed(2) }}</td>
              <td>
                <span class="badge" :class="s.activo ? 'badge-success' : 'badge-danger'">
                  {{ s.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="actions-cell">
                <button class="link-btn" @click="openEdit(s)">Editar</button>
                <button class="link-btn" :class="s.activo ? 'danger' : ''" @click="toggleEstado(s)">
                  {{ s.activo ? 'Desactivar' : 'Activar' }}
                </button>
              </td>
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
.top-actions { display: flex; justify-content: flex-end; }
.muted { color: var(--color-text-soft); }

.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 1rem;
  box-shadow: var(--shadow-md);
}
.modal h3 { margin: 0; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.check-field { display: flex; align-items: center; gap: 0.5rem; }
.check-field label { margin: 0; }
.modal-actions { display: flex; gap: 0.75rem; }

.table-wrapper { overflow-x: auto; }
.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.actions-cell { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.link-btn {
  background: none; border: 1px solid var(--color-card-border);
  color: var(--color-text); padding: 0.3rem 0.7rem; border-radius: 999px;
  font-size: 0.78rem; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.link-btn:hover { background: var(--color-bg-soft); }
.link-btn.danger { border-color: var(--color-danger); color: var(--color-danger); }
.link-btn.danger:hover { background: #fee2e2; }

.msg-error  { color: var(--color-danger); }
.msg-ok     { color: var(--color-success, #16a34a); }
</style>
