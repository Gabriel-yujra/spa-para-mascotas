<script setup>
import { ref, computed, onMounted } from 'vue';
import { tiendaApi } from '@/api/tiendaApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

// ── Estado de la vista ───────────────────────────────────────────────────────
// etapa: 'carrito' → 'confirmacion' → 'pagado'
const etapa      = ref('carrito');
const productos  = ref([]);
const carrito    = ref([]);   // [{ producto, cantidad }]
const loading    = ref(false);
const errorMsg   = ref('');

// Datos del pedido confirmado
const pedidoData  = ref(null);  // { id_pedido, mensaje, waLink, total, resumen }
const metodoPago  = ref('EFECTIVO');
const pagando     = ref(false);
const pagoMsg     = ref('');

async function loadProductos() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await tiendaApi.getProductos();
    productos.value = data.productos || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar productos';
  } finally {
    loading.value = false;
  }
}

// ── Carrito ──────────────────────────────────────────────────────────────────
function enCarrito(id_producto) {
  return carrito.value.find(c => c.producto.id_producto === id_producto);
}

function cantidadEnCarrito(id_producto) {
  return enCarrito(id_producto)?.cantidad ?? 0;
}

function agregar(producto) {
  const existing = enCarrito(producto.id_producto);
  if (existing) {
    if (existing.cantidad >= producto.stock_unidades) return;
    existing.cantidad += 1;
  } else {
    if (producto.stock_unidades < 1) return;
    carrito.value.push({ producto, cantidad: 1 });
  }
}

function quitar(id_producto) {
  const idx = carrito.value.findIndex(c => c.producto.id_producto === id_producto);
  if (idx === -1) return;
  if (carrito.value[idx].cantidad > 1) {
    carrito.value[idx].cantidad -= 1;
  } else {
    carrito.value.splice(idx, 1);
  }
}

function limpiarCarrito() {
  carrito.value = [];
  etapa.value   = 'carrito';
  pedidoData.value = null;
  pagoMsg.value = '';
  errorMsg.value = '';
}

const total = computed(() =>
  carrito.value.reduce((sum, c) => sum + c.producto.precio * c.cantidad, 0)
);

// ── Paso 1: enviar pedido ────────────────────────────────────────────────────
const enviando = ref(false);

async function enviarPedido() {
  if (!carrito.value.length) return;
  enviando.value = true;
  errorMsg.value = '';
  try {
    const items = carrito.value.map(c => ({
      id_producto: c.producto.id_producto,
      cantidad:    c.cantidad,
    }));
    pedidoData.value = await tiendaApi.crearPedido(items);
    etapa.value = 'confirmacion';
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al crear el pedido';
  } finally {
    enviando.value = false;
  }
}

// ── Paso 2: pagar pedido ─────────────────────────────────────────────────────
async function pagarPedido() {
  if (!pedidoData.value) return;
  pagando.value = true;
  pagoMsg.value = '';
  errorMsg.value = '';
  try {
    await tiendaApi.pagarPedido(pedidoData.value.id_pedido, metodoPago.value);
    pagoMsg.value = '¡Pago registrado! Tu pedido ha quedado confirmado.';
    etapa.value = 'pagado';
    carrito.value = [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al registrar el pago';
  } finally {
    pagando.value = false;
  }
}

async function copiarMensaje() {
  if (!pedidoData.value?.mensaje) return;
  try {
    await navigator.clipboard.writeText(pedidoData.value.mensaje);
    alert('Mensaje copiado al portapapeles');
  } catch {
    alert('No se pudo copiar. Cópialo manualmente.');
  }
}

onMounted(loadProductos);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2>Tienda Pet Spa</h2>
      <p class="muted">Productos disponibles para tu mascota</p>
    </header>

    <p v-if="errorMsg" class="msg-error">{{ errorMsg }}</p>
    <p v-if="loading"  class="muted center">Cargando productos…</p>

    <!-- ── Paso 1: catálogo + carrito ───────────────────────────────────── -->
    <div v-if="!loading && etapa === 'carrito'" class="layout">

      <!-- Productos -->
      <div class="productos-grid">
        <div
          v-for="p in productos"
          :key="p.id_producto"
          class="producto-card"
        >
          <div class="prod-info">
            <span class="prod-nombre">{{ p.nombre }}</span>
            <span class="prod-cat muted">{{ p.categoria }}</span>
            <span v-if="p.descripcion" class="prod-desc muted">{{ p.descripcion }}</span>
          </div>
          <div class="prod-stock" :class="p.stock_unidades <= 0 ? 'sin-stock' : 'muted'">
            Stock: {{ p.stock_unidades }} u.
          </div>
          <div class="prod-footer">
            <span class="prod-precio">Bs {{ Number(p.precio).toFixed(2) }}</span>
            <div class="prod-acciones">
              <button
                v-if="cantidadEnCarrito(p.id_producto) > 0"
                class="qty-btn"
                @click="quitar(p.id_producto)"
              >−</button>
              <span v-if="cantidadEnCarrito(p.id_producto) > 0" class="qty-label">
                {{ cantidadEnCarrito(p.id_producto) }}
              </span>
              <button
                class="qty-btn add-btn"
                :disabled="cantidadEnCarrito(p.id_producto) >= p.stock_unidades || p.stock_unidades <= 0"
                :title="cantidadEnCarrito(p.id_producto) >= p.stock_unidades ? 'Sin más unidades disponibles' : ''"
                @click="agregar(p)"
              >+</button>
            </div>
          </div>
        </div>
        <p v-if="!productos.length" class="muted center">No hay productos disponibles.</p>
      </div>

      <!-- Carrito -->
      <div class="carrito-panel">
        <AppCard title="Pedido">
          <div v-if="!carrito.length" class="muted center" style="padding:1.5rem 0">
            Tu carrito está vacío.
          </div>

          <template v-else>
            <div class="carrito-items">
              <div v-for="c in carrito" :key="c.producto.id_producto" class="carrito-row">
                <span class="ci-nombre">{{ c.producto.nombre }}</span>
                <div class="ci-qty">
                  <button class="qty-btn" @click="quitar(c.producto.id_producto)">−</button>
                  <span>{{ c.cantidad }}</span>
                  <button
                    class="qty-btn"
                    :disabled="c.cantidad >= c.producto.stock_unidades"
                    @click="agregar(c.producto)"
                  >+</button>
                </div>
                <span class="ci-subtotal">Bs {{ (c.producto.precio * c.cantidad).toFixed(2) }}</span>
              </div>
            </div>
            <div class="carrito-total">
              Total: <strong>Bs {{ total.toFixed(2) }}</strong>
            </div>
            <div class="carrito-acciones">
              <PrimaryButton :loading="enviando" @click="enviarPedido">
                Enviar pedido
              </PrimaryButton>
              <PrimaryButton variant="ghost" @click="limpiarCarrito">Limpiar</PrimaryButton>
            </div>
          </template>
        </AppCard>
      </div>
    </div>

    <!-- ── Paso 2: confirmación y pago ──────────────────────────────────── -->
    <div v-if="!loading && etapa === 'confirmacion' && pedidoData" class="confirmacion-wrap">
      <AppCard title="Pedido enviado — Confirma el pago">

        <!-- Resumen de productos -->
        <table class="resumen-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="center">Cant.</th>
              <th class="right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pedidoData.resumen" :key="item.nombre">
              <td>{{ item.nombre }}</td>
              <td class="center">{{ item.cantidad }}</td>
              <td class="right">Bs {{ item.subtotal.toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="right"><strong>Total</strong></td>
              <td class="right total-cell">Bs {{ pedidoData.total.toFixed(2) }}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Mensaje WhatsApp -->
        <details class="wa-details">
          <summary>Ver / copiar mensaje WhatsApp</summary>
          <pre class="pedido-msg">{{ pedidoData.mensaje }}</pre>
          <div class="pedido-btns">
            <button class="link-btn" @click="copiarMensaje">📋 Copiar mensaje</button>
            <a :href="pedidoData.waLink" target="_blank" rel="noopener" class="wa-btn">
              💬 Abrir WhatsApp
            </a>
          </div>
        </details>

        <!-- Método de pago -->
        <div class="pago-section">
          <label class="pago-label">Método de pago</label>
          <div class="metodo-group">
            <label v-for="m in ['EFECTIVO','QR','TRANSFERENCIA']" :key="m" class="metodo-opt">
              <input type="radio" :value="m" v-model="metodoPago" />
              {{ m }}
            </label>
          </div>
          <PrimaryButton :loading="pagando" @click="pagarPedido" style="margin-top:0.75rem">
            Confirmar pago
          </PrimaryButton>
        </div>
      </AppCard>

      <button class="link-btn back-link" @click="etapa = 'carrito'">← Volver al carrito</button>
    </div>

    <!-- ── Paso 3: pago exitoso ──────────────────────────────────────────── -->
    <div v-if="etapa === 'pagado'" class="pagado-wrap">
      <AppCard title="¡Pago registrado!">
        <p class="pagado-msg">{{ pagoMsg }}</p>
        <p class="muted">
          Pedido <strong>#{{ pedidoData?.id_pedido?.slice(0, 8).toUpperCase() }}</strong>
          por <strong>Bs {{ pedidoData?.total?.toFixed(2) }}</strong>
          — método: <strong>{{ metodoPago }}</strong>
        </p>
        <PrimaryButton variant="ghost" style="margin-top:1rem" @click="limpiarCarrito">
          Hacer otro pedido
        </PrimaryButton>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header h2 { margin: 0 0 0.25rem; }
.muted  { color: var(--color-text-soft); }
.center { text-align: center; }
.right  { text-align: right; }
.msg-error { color: var(--color-danger); }

/* ── Layout catálogo + carrito ── */
.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.25rem;
  align-items: start;
}
@media (max-width: 720px) {
  .layout { grid-template-columns: 1fr; }
}

.productos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.producto-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  background: #fff;
  gap: 0.5rem;
}
.prod-info { display: flex; flex-direction: column; gap: 0.2rem; }
.prod-nombre { font-weight: 700; font-size: 0.95rem; }
.prod-cat, .prod-desc { font-size: 0.8rem; }
.prod-stock { font-size: 0.78rem; font-weight: 600; }
.sin-stock  { color: var(--color-danger); }

.prod-footer { display: flex; justify-content: space-between; align-items: center; }
.prod-precio { font-size: 1.05rem; font-weight: 700; color: var(--color-primary); }
.prod-acciones { display: flex; align-items: center; gap: 0.35rem; }

.qty-btn {
  background: var(--color-bg-soft);
  border: 1px solid var(--color-card-border);
  border-radius: 6px;
  width: 28px; height: 28px;
  cursor: pointer;
  font-size: 1rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.qty-btn:not(:disabled):hover { background: var(--color-primary-soft); }
.add-btn { background: #f0fdf4; border-color: #86efac; color: #166534; }
.qty-label { font-weight: 700; min-width: 18px; text-align: center; }

/* ── Carrito ── */
.carrito-items { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
.carrito-row   { display: flex; align-items: center; gap: 0.5rem; }
.ci-nombre     { flex: 1; font-size: 0.9rem; font-weight: 600; }
.ci-qty        { display: flex; align-items: center; gap: 0.35rem; }
.ci-subtotal   { font-size: 0.9rem; font-weight: 700; min-width: 70px; text-align: right; }
.carrito-total {
  text-align: right; font-size: 1.05rem;
  border-top: 1px solid var(--color-card-border);
  padding-top: 0.5rem; margin-bottom: 0.85rem;
}
.carrito-acciones { display: flex; flex-direction: column; gap: 0.5rem; }

/* ── Confirmación ── */
.confirmacion-wrap { display: flex; flex-direction: column; gap: 0.75rem; max-width: 560px; }
.resumen-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.resumen-table th, .resumen-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid var(--color-card-border);
  font-size: 0.9rem;
}
.resumen-table tfoot td { border-bottom: none; padding-top: 0.6rem; }
.total-cell { font-weight: 700; font-size: 1rem; color: #16a34a; }

.wa-details {
  border: 1px dashed var(--color-card-border);
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  margin-bottom: 1rem;
  font-size: 0.88rem;
}
.wa-details summary { cursor: pointer; font-weight: 600; }
.pedido-msg {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.87rem;
  margin: 0.5rem 0;
}
.pedido-btns { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.pago-section { display: flex; flex-direction: column; gap: 0.5rem; }
.pago-label   { font-weight: 700; font-size: 0.88rem; }
.metodo-group { display: flex; gap: 1rem; flex-wrap: wrap; }
.metodo-opt   { display: flex; align-items: center; gap: 0.35rem; font-weight: 600; cursor: pointer; }

.back-link { margin-top: 0.25rem; font-size: 0.88rem; }

/* ── Pagado ── */
.pagado-wrap { max-width: 420px; }
.pagado-msg  { font-size: 1.05rem; font-weight: 700; color: #16a34a; margin-bottom: 0.5rem; }

/* ── Shared ── */
.link-btn {
  background: none;
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  padding: 0.4rem 0.85rem;
  cursor: pointer; font-size: 0.88rem; font-weight: 600; font-family: inherit;
}
.link-btn:hover { background: var(--color-bg-soft); }
.wa-btn {
  display: inline-flex; align-items: center; gap: 0.35rem;
  background: #25d366; color: #fff; font-weight: 700; font-size: 0.88rem;
  padding: 0.4rem 0.85rem; border-radius: 8px; text-decoration: none;
}
.wa-btn:hover { opacity: 0.88; }
</style>
