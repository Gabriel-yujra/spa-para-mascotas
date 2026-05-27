<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { groomingApi } from '@/api/groomingApi';
import { tiendaApi }   from '@/api/tiendaApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import perroDefault from '@/assets/perro-default.svg';
import gatoDefault  from '@/assets/gato-default.svg';

const BACKEND_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/api\/?$/, '');
function mascotaFotoSrc(m) {
  if (m?.foto_url) return `${BACKEND_URL}${m.foto_url}`;
  if (m?.especie === 'perro') return perroDefault;
  if (m?.especie === 'gato')  return gatoDefault;
  return perroDefault;
}

const route  = useRoute();
const router = useRouter();

const idCita = route.params.idCita;

const mascota     = ref(null);
const ficha       = ref(null);
const citaInfo    = ref(null);
const fotos       = ref([]);
const loading     = ref(false);
const saving      = ref(false);
const errorMsg    = ref('');
const successMsg  = ref('');

// Editable ficha fields
const form = ref({
  estado_ingreso:      '',
  observaciones:       '',
  recomendaciones:     '',
  tamano_mascota:      '',
  temperatura:         '',
  notas_internas:      '',
  nuevo_estado_global: '',
});

// Checklist: array of { id_item, nombre, realizado, observacion }
const checklist = ref([]);

// Insumos
const productosDisponibles = ref([]);
const insumos = ref([]);      // [{ id_producto, unidades_usadas }]
const savingInsumos = ref(false);
const insumosMsg = ref('');

// Fotos de servicio
const uploadingFoto = ref(false);
const fotoMsg = ref('');

// Precio
const precioFinal = ref(null);
const precioAjustado = ref(false);

// Tamano original (read-only, from ficha.tamano_original_mascota or mascota.tamano)
const tamanoOriginal = computed(() =>
  ficha.value?.tamano_original_mascota || mascota.value?.tamano || ''
);

const TAMANO_ORDEN = { pequeno: 1, mediano: 2, grande: 3, gigante: 4 };
const TAMANO_OPTIONS = [
  { value: 'pequeno', label: 'Pequeño' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande',  label: 'Grande'  },
  { value: 'gigante', label: 'Gigante' },
];
function tamanoDisabled(v) {
  if (!tamanoOriginal.value) return false;
  return (TAMANO_ORDEN[v] || 0) < (TAMANO_ORDEN[tamanoOriginal.value] || 0);
}
const tamanoAdviso = computed(() => {
  if (!tamanoOriginal.value || !form.value.tamano_mascota) return '';
  const ord = TAMANO_ORDEN[form.value.tamano_mascota] || 0;
  const orig = TAMANO_ORDEN[tamanoOriginal.value] || 0;
  if (ord > orig) return `⚠ Tamaño ajustado a "${form.value.tamano_mascota}" (original: "${tamanoOriginal.value}"). El precio se recalculará al guardar.`;
  return '';
});

const ESTADO_OPTIONS = [
  { value: '',            label: '— Sin cambio de estado —' },
  { value: 'en_progreso', label: 'Marcar en progreso' },
  { value: 'completada',  label: 'Marcar completada' },
];

const ESTADO_LABELS = {
  pendiente:    'Pendiente',
  confirmada:   'Confirmada',
  en_progreso:  'En progreso',
  completada:   'Completada',
  cancelada:    'Cancelada',
  no_asistio:   'No asistió',
  reprogramada: 'Reprogramada',
};

function estadoBadgeClass(e) {
  return { pendiente: 'badge-warning', confirmada: '', en_progreso: 'badge-warning',
           completada: 'badge-success', cancelada: 'badge-danger',
           no_asistio: 'badge-danger', reprogramada: 'badge-warning' }[e] || '';
}

function tamanoLabel(t) {
  return { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande', gigante: 'Gigante' }[t] || t || '—';
}

async function loadFicha() {
  loading.value  = true;
  errorMsg.value = '';
  try {
    const [data, prodData] = await Promise.all([
      groomingApi.getFicha(idCita),
      tiendaApi.getProductos(),
    ]);
    mascota.value  = data.mascota  || null;
    ficha.value    = data.ficha    || null;
    citaInfo.value = data.cita     || null;
    fotos.value    = data.fotos    || [];
    checklist.value = (data.checklist || []).map(item => ({ ...item }));
    insumos.value = (data.insumos || []).map(i => ({
      id_producto: i.id_producto,
      unidades_usadas: i.unidades_usadas,
      producto_nombre: i.producto_nombre,
    }));
    productosDisponibles.value = prodData.productos || [];

    if (ficha.value) {
      form.value.estado_ingreso  = ficha.value.estado_ingreso  || '';
      form.value.observaciones   = ficha.value.observaciones   || '';
      form.value.recomendaciones = ficha.value.recomendaciones || '';
      // Pre-fill tamano from ficha (backend auto-fills from mascota on first open)
      form.value.tamano_mascota  = ficha.value.tamano_mascota  || mascota.value?.tamano || '';
      form.value.temperatura     = ficha.value.temperatura     != null ? String(ficha.value.temperatura) : '';
      form.value.notas_internas  = ficha.value.notas_internas  || '';
    }
    if (data.cita) {
      precioFinal.value    = data.cita.precio_final    ?? null;
      precioAjustado.value = data.cita.precio_ajustado ?? false;
    }
  } catch (err) {
    if (err.response?.status === 403) {
      errorMsg.value = 'Esta cita no está asignada a tu usuario.';
    } else if (err.response?.status === 404) {
      errorMsg.value = 'Cita no encontrada.';
    } else {
      errorMsg.value = err.response?.data?.error || 'Error al cargar la ficha';
    }
  } finally {
    loading.value = false;
  }
}

async function guardar() {
  saving.value     = true;
  errorMsg.value   = '';
  successMsg.value = '';
  try {
    const payload = {
      estado_ingreso:  form.value.estado_ingreso  || null,
      observaciones:   form.value.observaciones   || null,
      recomendaciones: form.value.recomendaciones || null,
      tamano_mascota:  form.value.tamano_mascota  || null,
      temperatura:     form.value.temperatura     || null,
      notas_internas:  form.value.notas_internas  || null,
      checklist: checklist.value.map(item => ({
        id_item:     item.id_item,
        realizado:   item.realizado,
        observacion: item.observacion || null,
      })),
    };
    if (form.value.nuevo_estado_global) {
      payload.nuevo_estado_global = form.value.nuevo_estado_global;
    }

    const data = await groomingApi.updateFicha(idCita, payload);
    if (data.ficha) ficha.value = data.ficha;
    if (data.cita)  citaInfo.value = { ...citaInfo.value, estado_global: data.cita.estado_global };
    if (data.precio_calculado !== undefined) {
      precioFinal.value    = data.precio_calculado;
      precioAjustado.value = true;
    }
    successMsg.value = 'Ficha guardada correctamente.';
    form.value.nuevo_estado_global = '';
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al guardar la ficha';
  } finally {
    saving.value = false;
  }
}

function addInsumoRow() {
  insumos.value.push({ id_producto: '', unidades_usadas: 0.5, producto_nombre: '' });
}

function snapToHalf(idx) {
  const raw = parseFloat(insumos.value[idx].unidades_usadas) || 0;
  const snapped = Math.round(raw * 2) / 2;
  insumos.value[idx].unidades_usadas = snapped < 0.5 ? 0.5 : snapped;
}
function removeInsumoRow(idx) {
  insumos.value.splice(idx, 1);
}
function onProductoChange(idx) {
  const prod = productosDisponibles.value.find(p => p.id_producto === insumos.value[idx].id_producto);
  if (prod) insumos.value[idx].producto_nombre = prod.nombre;
}
async function guardarInsumos() {
  savingInsumos.value = true;
  insumosMsg.value = '';
  try {
    const items = insumos.value
      .filter(i => i.id_producto && parseFloat(i.unidades_usadas) > 0)
      .map(i => {
        const raw     = parseFloat(i.unidades_usadas) || 0;
        const snapped = Math.max(0.5, Math.round(raw * 2) / 2);
        return { id_producto: i.id_producto, unidades_usadas: snapped };
      });
    const data = await groomingApi.saveInsumos(idCita, items);
    insumos.value = (data.insumos || []).map(i => ({
      id_producto: i.id_producto,
      unidades_usadas: i.unidades_usadas,
      producto_nombre: i.producto_nombre || '',
    }));
    insumosMsg.value = 'Insumos guardados correctamente.';
  } catch (err) {
    insumosMsg.value = err.response?.data?.error || 'Error al guardar insumos';
  } finally {
    savingInsumos.value = false;
  }
}

function triggerFotoInput(tipo) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadingFoto.value = true;
    fotoMsg.value = '';
    try {
      const data = await groomingApi.uploadFoto(idCita, file, tipo);
      fotos.value = [...fotos.value, data.foto];
      fotoMsg.value = `Foto de ${tipo} subida correctamente.`;
    } catch (err) {
      fotoMsg.value = err.response?.data?.error || 'Error al subir la foto';
    } finally {
      uploadingFoto.value = false;
    }
  };
  input.click();
}

const fotoLlegada = computed(() => fotos.value.find(f => f.tipo === 'llegada') || null);
const fotoSalida  = computed(() => fotos.value.find(f => f.tipo === 'salida')  || null);

const checklistWarning = computed(() => {
  if (form.value.nuevo_estado_global !== 'completada') return '';
  const hasDone = checklist.value.some((i) => i.realizado);
  return hasDone ? '' : 'Debes marcar al menos 1 ítem del checklist antes de completar la ficha.';
});

onMounted(loadFicha);
</script>

<template>
  <div class="ficha-page">
    <div class="back-row">
      <button class="back-btn" @click="router.back()">← Volver a la agenda</button>
    </div>

    <p v-if="loading" class="muted center">Cargando…</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <template v-if="!loading && (mascota || ficha)">

      <!-- ── Cita info bar ─────────────────────────────────────── -->
      <div v-if="citaInfo" class="cita-bar">
        <span>{{ citaInfo.servicio_nombre || 'Servicio' }}</span>
        <span class="badge" :class="estadoBadgeClass(citaInfo.estado_global)">
          {{ ESTADO_LABELS[citaInfo.estado_global] || citaInfo.estado_global }}
        </span>
      </div>

      <!-- ── Datos de la mascota ──────────────────────────────── -->
      <AppCard title="Mascota">
        <div class="mascota-header">
          <img :src="mascotaFotoSrc(mascota)" :alt="mascota?.nombre" class="mascota-avatar-lg" />
          <span class="mascota-nombre-lg">{{ mascota?.nombre || '—' }}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Nombre</span>
            <span class="detail-value">{{ mascota?.nombre || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Especie / Raza</span>
            <span class="detail-value">
              {{ [mascota?.especie, mascota?.raza].filter(Boolean).join(' / ') || '—' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tamaño</span>
            <span class="detail-value">{{ tamanoLabel(mascota?.tamano) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Temperamento</span>
            <span class="detail-value">{{ mascota?.temperamento || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Alergias</span>
            <span v-if="mascota?.alergias" class="badge badge-warning">{{ mascota.alergias }}</span>
            <span v-else class="muted">Ninguna</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Restricciones</span>
            <span v-if="mascota?.restricciones" class="badge badge-warning">{{ mascota.restricciones }}</span>
            <span v-else class="muted">Ninguna</span>
          </div>
          <div v-if="mascota?.notas" class="detail-item detail-item--full">
            <span class="detail-label">Notas del dueño</span>
            <span class="detail-value">{{ mascota.notas }}</span>
          </div>
        </div>
      </AppCard>

      <!-- ── Checklist ─────────────────────────────────────────── -->
      <AppCard title="Checklist de servicios">
        <div class="checklist-grid">
          <label
            v-for="item in checklist"
            :key="item.id_item"
            class="check-item"
            :class="{ 'check-item--done': item.realizado }"
          >
            <input type="checkbox" v-model="item.realizado" />
            <span class="check-nombre">{{ item.nombre }}</span>
          </label>
        </div>
      </AppCard>

      <!-- ── Insumos usados ────────────────────────────────────── -->
      <AppCard title="Insumos usados">
        <p class="muted insumos-note">Registra los productos consumidos durante el servicio. Al cerrar la ficha, el stock se descuenta automáticamente.</p>
        <p v-if="insumosMsg" :class="insumosMsg.includes('Error') ? 'error' : 'success'">{{ insumosMsg }}</p>

        <div v-if="ficha?.consumido_inventario" class="insumos-locked">
          Inventario ya descontado al cerrar la ficha.
          <ul v-if="insumos.length" class="insumos-list-ro">
            <li v-for="ins in insumos" :key="ins.id_producto">
              {{ ins.producto_nombre }} — {{ ins.unidades_usadas }} unid.
            </li>
          </ul>
          <p v-else class="muted">Sin insumos registrados.</p>
        </div>

        <template v-else>
          <div v-if="insumos.length" class="insumos-table">
            <div v-for="(ins, idx) in insumos" :key="idx" class="insumo-row">
              <select v-model="ins.id_producto" @change="onProductoChange(idx)" class="insumo-select">
                <option value="">— Seleccionar producto —</option>
                <option v-for="p in productosDisponibles" :key="p.id_producto" :value="p.id_producto">
                  {{ p.nombre }} (stock: {{ p.stock_unidades }})
                </option>
              </select>
              <input type="number" v-model.number="ins.unidades_usadas" min="0.5" step="0.5" class="insumo-qty" placeholder="0.5" @change="snapToHalf(idx)" />
              <button class="remove-btn" @click="removeInsumoRow(idx)">✕</button>
            </div>
          </div>
          <p v-else class="muted" style="margin-bottom:0.75rem">Sin insumos añadidos.</p>
          <div class="insumos-actions">
            <PrimaryButton variant="ghost" @click="addInsumoRow">+ Añadir insumo</PrimaryButton>
            <PrimaryButton :loading="savingInsumos" @click="guardarInsumos">Guardar insumos</PrimaryButton>
          </div>
        </template>
      </AppCard>

      <!-- ── Ficha técnica ──────────────────────────────────────── -->
      <AppCard title="Ficha de grooming">
        <p v-if="successMsg" class="success">{{ successMsg }}</p>

        <div class="form-grid">
          <div class="field">
            <label>Estado de ingreso</label>
            <textarea
              v-model="form.estado_ingreso"
              rows="3"
              placeholder="Describe el estado del animal al ingresar…"
            ></textarea>
          </div>

          <div class="field">
            <label>Observaciones</label>
            <textarea
              v-model="form.observaciones"
              rows="3"
              placeholder="Observaciones generales del servicio…"
            ></textarea>
          </div>

          <div class="field field--full">
            <label>Recomendaciones para el dueño</label>
            <textarea
              v-model="form.recomendaciones"
              rows="3"
              placeholder="Ej. Cepillar 3 veces por semana, revisar oídos cada mes…"
            ></textarea>
          </div>

          <div class="field">
            <label>
              Tamaño (verificado en consulta)
              <span v-if="tamanoOriginal" class="field-hint">
                — registrado: {{ tamanoLabel(tamanoOriginal) }}
              </span>
            </label>
            <select v-model="form.tamano_mascota">
              <option value="">— No especificado —</option>
              <option
                v-for="opt in TAMANO_OPTIONS"
                :key="opt.value"
                :value="opt.value"
                :disabled="tamanoDisabled(opt.value)"
              >
                {{ opt.label }}{{ tamanoDisabled(opt.value) ? ' (menor al registrado)' : '' }}
              </option>
            </select>
            <small v-if="tamanoAdviso" class="tamano-adviso">{{ tamanoAdviso }}</small>
          </div>

          <!-- Precio estimado -->
          <div v-if="precioFinal != null" class="field">
            <label>Precio estimado del servicio</label>
            <p class="precio-display">
              Bs {{ Number(precioFinal).toFixed(2) }}
              <span v-if="precioAjustado" class="precio-ajustado-badge">ajustado por tamaño</span>
            </p>
          </div>

          <div class="field">
            <label>Temperatura (°C)</label>
            <input
              type="text"
              v-model="form.temperatura"
              placeholder="Ej. 38.5"
            />
          </div>

          <div class="field field--full">
            <label>Notas internas (no visibles al cliente)</label>
            <textarea
              v-model="form.notas_internas"
              rows="2"
              placeholder="Notas privadas del groomer…"
            ></textarea>
          </div>

          <div class="field">
            <label>Cambiar estado de la cita</label>
            <select v-model="form.nuevo_estado_global">
              <option v-for="opt in ESTADO_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <p v-if="checklistWarning" class="checklist-warning">{{ checklistWarning }}</p>

        <div class="form-actions">
          <PrimaryButton @click="guardar" :loading="saving" :disabled="!!checklistWarning">Guardar cambios</PrimaryButton>
        </div>
      </AppCard>

      <!-- ── Fotos de servicio ─────────────────────────────────── -->
      <AppCard title="Fotos del servicio">
        <p v-if="fotoMsg" :class="fotoMsg.includes('Error') ? 'error' : 'success'">{{ fotoMsg }}</p>

        <div class="fotos-servicio-grid">
          <!-- Foto de llegada -->
          <div class="foto-slot">
            <p class="foto-slot-title">📥 Llegada</p>
            <div v-if="fotoLlegada" class="foto-item">
              <img :src="`${BACKEND_URL}${fotoLlegada.url_foto}`" alt="Llegada" class="foto-img" />
            </div>
            <div v-else class="foto-placeholder">Sin foto</div>
            <PrimaryButton
              variant="ghost"
              size="sm"
              :loading="uploadingFoto"
              @click="triggerFotoInput('llegada')"
            >
              {{ fotoLlegada ? 'Cambiar foto llegada' : 'Subir foto llegada' }}
            </PrimaryButton>
          </div>

          <!-- Foto de salida -->
          <div class="foto-slot">
            <p class="foto-slot-title">📤 Salida</p>
            <div v-if="fotoSalida" class="foto-item">
              <img :src="`${BACKEND_URL}${fotoSalida.url_foto}`" alt="Salida" class="foto-img" />
            </div>
            <div v-else class="foto-placeholder">Sin foto</div>
            <PrimaryButton
              variant="ghost"
              size="sm"
              :loading="uploadingFoto"
              @click="triggerFotoInput('salida')"
            >
              {{ fotoSalida ? 'Cambiar foto salida' : 'Subir foto salida' }}
            </PrimaryButton>
          </div>
        </div>
      </AppCard>

    </template>
  </div>
</template>

<style scoped>
.ficha-page { display: flex; flex-direction: column; gap: 1.25rem; }

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

.cita-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 0.95rem;
}

.mascota-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1rem;
}
.mascota-avatar-lg {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-card-border);
  background: var(--color-bg-soft);
  flex-shrink: 0;
}
.mascota-nombre-lg { font-size: 1.1rem; font-weight: 800; color: var(--color-text); }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.85rem 1.5rem;
}
.detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.detail-value { font-size: 0.95rem; color: var(--color-text); font-weight: 600; }

/* ── Checklist ── */
.checklist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.6rem;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 600;
  background: var(--color-bg);
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
}
.check-item input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-primary); flex-shrink: 0; }
.check-item--done {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

/* ── Form ── */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.85rem 1.25rem;
}
.field--full { grid-column: 1 / -1; }
.form-actions { margin-top: 1rem; }

/* ── Fotos de servicio ── */
.fotos-servicio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}
.foto-slot {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.foto-slot-title {
  font-weight: 700;
  font-size: 0.92rem;
  margin: 0;
}
.foto-placeholder {
  width: 100%;
  height: 130px;
  background: var(--color-bg-soft);
  border: 2px dashed var(--color-card-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-soft);
  font-size: 0.85rem;
}
.foto-item { display: flex; flex-direction: column; }
.foto-img {
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-card-border);
}

/* ── Tamano / precio ── */
.field-hint { font-weight: 400; color: var(--color-text-soft); font-size: 0.82rem; }
.tamano-adviso {
  display: block;
  margin-top: 0.35rem;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.82rem;
}
.precio-display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}
.precio-ajustado-badge {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #86efac;
  border-radius: 999px;
  padding: 0.15rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.center { text-align: center; padding: 2rem; }

/* ── Insumos ── */
.insumos-note { font-size: 0.85rem; margin-bottom: 0.75rem; }
.insumos-locked {
  background: #f0fdf4; border: 1px solid #86efac;
  border-radius: 8px; padding: 0.85rem; font-size: 0.9rem; color: #166534;
}
.insumos-list-ro { margin: 0.5rem 0 0 1.25rem; }
.insumos-table { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
.insumo-row { display: flex; gap: 0.5rem; align-items: center; }
.insumo-select { flex: 1; }
.insumo-qty { width: 80px; }
.remove-btn {
  background: none; border: 1px solid var(--color-danger);
  color: var(--color-danger); border-radius: 6px;
  padding: 0.3rem 0.6rem; cursor: pointer; font-size: 0.8rem; line-height: 1;
}
.remove-btn:hover { background: #fee2e2; }
.insumos-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.checklist-warning {
  margin: 0.5rem 0 0;
  padding: 0.55rem 0.85rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
