<script setup>
import { ref, onMounted } from 'vue';
import { productoApi } from '@/api/productoApi';
import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const productos  = ref([]);
const loading    = ref(false);
const errorMsg   = ref('');
const successMsg = ref('');
const saving     = ref(false);
const showForm   = ref(false);
const editando   = ref(null);

const ESTADOS = ['disponible', 'agotado', 'descontinuado'];

const form = ref({
  nombre: '', descripcion: '', categoria: '', precio: 0,
  stock_unidades: 0, stock_minimo: 0, unidad_presentacion: '', sku: '',
});

async function load() {
  loading.value = true; errorMsg.value = '';
  try {
    const data = await productoApi.getProductos(true);
    productos.value = data.productos || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar productos';
  } finally { loading.value = false; }
}

function openCreate() {
  editando.value = null;
  form.value = { nombre: '', descripcion: '', categoria: '', precio: 0, stock_unidades: 0, stock_minimo: 0, unidad_presentacion: '', sku: '' };
  showForm.value = true; errorMsg.value = ''; successMsg.value = '';
}

function openEdit(p) {
  editando.value = p;
  form.value = {
    nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria,
    precio: p.precio, stock_unidades: p.stock_unidades, stock_minimo: p.stock_minimo,
    unidad_presentacion: p.unidad_presentacion || '', sku: p.sku || '',
  };
  showForm.value = true; errorMsg.value = ''; successMsg.value = '';
}

async function saveForm() {
  if (!form.value.nombre || !form.value.categoria || form.value.precio == null) {
    errorMsg.value = 'Nombre, categoría y precio son requeridos'; return;
  }
  saving.value = true; errorMsg.value = '';
  try {
    if (editando.value) {
      await productoApi.updateProducto(editando.value.id_producto, form.value);
      successMsg.value = 'Producto actualizado';
    } else {
      await productoApi.createProducto(form.value);
      successMsg.value = 'Producto creado';
    }
    showForm.value = false;
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al guardar';
  } finally { saving.value = false; }
}

async function cambiarEstado(p, estado) {
  errorMsg.value = '';
  try {
    await productoApi.updateProductoEstado(p.id_producto, estado);
    successMsg.value = `Estado actualizado a "${estado}"`;
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cambiar estado';
  }
}

function estadoBadge(estado) {
  if (estado === 'disponible')   return 'badge-success';
  if (estado === 'agotado')      return 'badge-warning';
  if (estado === 'descontinuado') return 'badge-danger';
  return '';
}

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2>Inventario / Productos</h2>
      <p class="muted">Gestión básica del catálogo de productos e insumos</p>
    </header>

    <p v-if="errorMsg"   class="msg-error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="msg-ok">{{ successMsg }}</p>

    <div class="top-actions">
      <PrimaryButton @click="openCreate">+ Nuevo producto</PrimaryButton>
    </div>

    <!-- Modal formulario -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>{{ editando ? 'Editar producto' : 'Nuevo producto' }}</h3>
        <div class="row2">
          <div class="field">
            <label>Nombre *</label>
            <input v-model="form.nombre" placeholder="Shampoo..." />
          </div>
          <div class="field">
            <label>Categoría *</label>
            <input v-model="form.categoria" placeholder="higiene, insumo..." />
          </div>
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea v-model="form.descripcion" rows="2" placeholder="Opcional" />
        </div>
        <div class="row3">
          <div class="field">
            <label>Precio (Bs) *</label>
            <input v-model.number="form.precio" type="number" min="0" step="0.01" />
          </div>
          <div class="field">
            <label>Stock actual</label>
            <input v-model.number="form.stock_unidades" type="number" min="0" step="0.01" />
          </div>
          <div class="field">
            <label>Stock mínimo</label>
            <input v-model.number="form.stock_minimo" type="number" min="0" step="0.01" />
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <label>Unidad presentación</label>
            <input v-model="form.unidad_presentacion" placeholder="ml, kg, unid..." />
          </div>
          <div class="field">
            <label>SKU</label>
            <input v-model="form.sku" placeholder="Código interno" />
          </div>
        </div>
        <div class="modal-actions">
          <PrimaryButton :loading="saving" @click="saveForm">Guardar</PrimaryButton>
          <PrimaryButton variant="ghost" @click="showForm = false">Cancelar</PrimaryButton>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <AppCard :title="`Productos (${productos.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!productos.length" class="state">Sin productos. Crea el primero.</div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Stock mín.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in productos" :key="p.id_producto"
                :class="{ 'row-alerta': Number(p.stock_unidades) <= Number(p.stock_minimo) && p.estado === 'disponible' }">
              <td><b>{{ p.nombre }}</b></td>
              <td class="muted">{{ p.categoria }}</td>
              <td>Bs {{ Number(p.precio).toFixed(2) }}</td>
              <td :class="Number(p.stock_unidades) <= Number(p.stock_minimo) ? 'red' : ''">
                {{ p.stock_unidades }} {{ p.unidad_presentacion || '' }}
              </td>
              <td class="muted">{{ p.stock_minimo }}</td>
              <td>
                <span class="badge" :class="estadoBadge(p.estado)">{{ p.estado }}</span>
              </td>
              <td class="actions-cell">
                <button class="link-btn" @click="openEdit(p)">Editar</button>
                <select class="estado-select" :value="p.estado" @change="cambiarEstado(p, $event.target.value)">
                  <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
                </select>
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
.muted { color: var(--color-text-soft); }
.top-actions { display: flex; justify-content: flex-end; }
.red { color: var(--color-danger); font-weight: 600; }

.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: #fff; border-radius: var(--radius-lg); padding: 1.75rem;
  width: 100%; max-width: 540px; display: flex; flex-direction: column; gap: 1rem;
  box-shadow: var(--shadow-md);
}
.modal h3 { margin: 0; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
.modal-actions { display: flex; gap: 0.75rem; }

.table-wrapper { overflow-x: auto; }
.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.actions-cell { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; }
.link-btn {
  background: none; border: 1px solid var(--color-card-border);
  color: var(--color-text); padding: 0.3rem 0.7rem; border-radius: 999px;
  font-size: 0.78rem; cursor: pointer; font-family: inherit;
}
.link-btn:hover { background: var(--color-bg-soft); }
.estado-select {
  font-size: 0.78rem; border: 1px solid var(--color-card-border);
  border-radius: 999px; padding: 0.2rem 0.5rem; cursor: pointer;
  font-family: inherit; background: #fff;
}
.row-alerta { background: #fffbeb; }

.msg-error { color: var(--color-danger); }
.msg-ok    { color: #16a34a; }
</style>
