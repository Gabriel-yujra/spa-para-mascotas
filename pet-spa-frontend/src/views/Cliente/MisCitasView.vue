<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { citaApi }   from '@/api/citaApi';
import { opinionApi } from '@/api/opinionApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import QRCode        from 'qrcode';

const router     = useRouter();
const citas      = ref([]);
const loading    = ref(false);
const errorMsg   = ref('');
const successMsg = ref('');

// Cancelation
const cancelId       = ref(null);
const cancelMotivo   = ref('');
const cancelling     = ref(false);

// Opinión (modal independiente, para citas ya pagadas)
const opinionCita      = ref(null);
const opinionCal       = ref(0);
const opinionComentario = ref('');
const opinionSaving    = ref(false);
const opiniadasIds     = ref(new Set());

// Pago
const pagoCita      = ref(null);   // cita que se está pagando
const pagoMetodo    = ref('EFECTIVO');
const pagoMostrarQR = ref(false);
const pagoOpCal     = ref(0);      // opinión opcional dentro del pago
const pagoOpComent  = ref('');
const pagoSaving    = ref(false);
const qrDataUrl     = ref('');

const METODOS_PAGO = [
  { value: 'EFECTIVO',      label: 'Efectivo',      icon: '💵' },
  { value: 'QR',            label: 'QR',            icon: '📱' },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦' },
];

function abrirPago(cita) {
  pagoCita.value      = cita;
  pagoMetodo.value    = 'EFECTIVO';
  pagoMostrarQR.value = false;
  qrDataUrl.value     = '';
  pagoOpCal.value     = 0;
  pagoOpComent.value  = '';
  errorMsg.value      = '';
  successMsg.value    = '';
}

async function toggleQR() {
  pagoMostrarQR.value = !pagoMostrarQR.value;
  if (pagoMostrarQR.value && !qrDataUrl.value && pagoCita.value) {
    const texto = `PetSpa|cita:${pagoCita.value.id_cita}|monto:${Number(pagoCita.value.precio || 0).toFixed(2)}`;
    qrDataUrl.value = await QRCode.toDataURL(texto, {
      width: 200,
      margin: 2,
      color: { dark: '#15803d', light: '#ffffff' },
    });
  }
}

function cerrarPago() {
  pagoCita.value = null;
}

async function confirmarPago() {
  if (!pagoCita.value) return;
  pagoSaving.value = true;
  errorMsg.value   = '';
  try {
    const payload = {
      metodo_pago: pagoMetodo.value,
    };
    if (pagoOpCal.value >= 1) {
      payload.opinion = { calificacion: pagoOpCal.value, comentario: pagoOpComent.value };
    }
    await citaApi.pagarCita(pagoCita.value.id_cita, payload);
    if (pagoOpCal.value >= 1) {
      opiniadasIds.value.add(pagoCita.value.id_cita);
    }
    successMsg.value = `✅ Pago registrado correctamente (${pagoMetodo.value})`;
    cerrarPago();
    await loadCitas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al registrar el pago';
  } finally {
    pagoSaving.value = false;
  }
}

// Estado label and badge helpers
const ESTADO_LABELS = {
  pendiente:    'Pendiente',
  confirmada:   'Confirmada',
  en_progreso:  'En progreso',
  completada:   'Completada',
  cancelada:    'Cancelada',
  no_asistio:   'No asistió',
  reprogramada: 'Reprogramada',
};

function estadoLabel(e) {
  return ESTADO_LABELS[e] || e;
}

function estadoBadgeClass(e) {
  const map = {
    pendiente:    'badge-warning',
    confirmada:   '',           // default primary
    en_progreso:  'badge-warning',
    completada:   'badge-success',
    cancelada:    'badge-danger',
    no_asistio:   'badge-danger',
    reprogramada: 'badge-warning',
  };
  return map[e] || '';
}

// A cita is cancellable if its estado_global allows → cancelada transition
const CANCELABLE = new Set(['pendiente', 'confirmada', 'reprogramada']);
function isCancelable(cita) {
  return CANCELABLE.has(cita.estado_global);
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  // fecha_cita is a date string: "YYYY-MM-DD"
  const [y, m, d] = fechaStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatHora(tsStr) {
  if (!tsStr) return '—';
  // hora_inicio is a timestamp from cita_trabajadores
  const d = new Date(tsStr);
  if (isNaN(d)) return tsStr;
  return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─────────────────────────────────────────────────────────────
async function loadCitas() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const [citasData, opinionesData] = await Promise.all([
      citaApi.getMisCitas(),
      opinionApi.getMisOpiniones().catch(() => ({ opiniones: [] })),
    ]);
    citas.value = citasData.citas || [];
    opiniadasIds.value = new Set((opinionesData.opiniones || []).map((o) => o.id_cita));
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar citas';
  } finally {
    loading.value = false;
  }
}

function abrirOpinion(cita) {
  opinionCita.value       = cita;
  opinionCal.value        = 0;
  opinionComentario.value = '';
  errorMsg.value          = '';
  successMsg.value        = '';
}

async function enviarOpinion() {
  if (!opinionCal.value) { errorMsg.value = 'Selecciona una calificación'; return; }
  opinionSaving.value = true; errorMsg.value = '';
  try {
    await opinionApi.crearOpinion({
      id_cita: opinionCita.value.id_cita,
      calificacion: opinionCal.value,
      comentario: opinionComentario.value,
    });
    opiniadasIds.value.add(opinionCita.value.id_cita);
    successMsg.value  = '¡Gracias por tu opinión!';
    opinionCita.value = null;
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al enviar opinión';
  } finally { opinionSaving.value = false; }
}

function askCancel(id) {
  cancelId.value    = id;
  cancelMotivo.value = '';
  errorMsg.value    = '';
  successMsg.value  = '';
}

async function confirmCancel() {
  cancelling.value = true;
  try {
    await citaApi.cancelarCita(cancelId.value, { motivo: cancelMotivo.value || undefined });
    successMsg.value = '✅ Cita cancelada correctamente';
    cancelId.value   = null;
    await loadCitas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se pudo cancelar la cita';
    cancelId.value = null;
  } finally {
    cancelling.value = false;
  }
}

onMounted(loadCitas);
</script>

<template>
  <div class="citas-page">
    <header class="page-header">
      <h2>📋 Mis citas</h2>
      <p class="muted">Historial y estado de tus citas en Pet Spa</p>
    </header>

    <div class="top-actions">
      <router-link to="/solicitar-cita">
        <PrimaryButton>+ Solicitar nueva cita</PrimaryButton>
      </router-link>
    </div>

    <p v-if="errorMsg"   class="error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="success">{{ successMsg }}</p>

    <!-- ── Payment modal ─────────────────────────────────────── -->
    <div v-if="pagoCita" class="modal-overlay" @click.self="cerrarPago">
      <div class="modal pago-modal">
        <h3>Pagar cita</h3>
        <div class="pago-resumen">
          <div class="pago-resumen-row">
            <span class="muted">Mascota</span>
            <b>{{ pagoCita.mascota_nombre }}</b>
          </div>
          <div class="pago-resumen-row">
            <span class="muted">Servicio</span>
            <span>{{ pagoCita.servicio_nombre }}</span>
          </div>
          <div class="pago-resumen-row">
            <span class="muted">Monto a pagar</span>
            <b class="monto-total">Bs {{ Number(pagoCita.precio || 0).toFixed(2) }}</b>
          </div>
        </div>

        <div class="field">
          <label>Método de pago *</label>
          <div class="metodo-radios">
            <label v-for="m in METODOS_PAGO" :key="m.value" class="radio-label" :class="{ selected: pagoMetodo === m.value }">
              <input type="radio" v-model="pagoMetodo" :value="m.value" @change="pagoMostrarQR = false" />
              {{ m.icon }} {{ m.label }}
            </label>
          </div>
        </div>

        <div v-if="pagoMetodo === 'QR'" class="qr-section">
          <button class="link-btn" @click="toggleQR">
            {{ pagoMostrarQR ? 'Ocultar QR' : 'Mostrar QR de pago' }}
          </button>
          <div v-if="pagoMostrarQR" class="qr-box">
            <div class="qr-wrapper">
              <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR de pago Pet Spa" width="200" height="200" />
              <div v-else class="qr-generating">Generando QR…</div>
              <div v-if="qrDataUrl" class="qr-paw-overlay">🐾</div>
            </div>
            <p class="muted" style="font-size:0.8rem;margin:0.75rem 0 0">
              Cuenta: 4-0123456-789 · Banco Pet Spa<br/>
              Monto exacto: <b>Bs {{ Number(pagoCita.precio || 0).toFixed(2) }}</b>
            </p>
          </div>
        </div>

        <div class="field opinion-opt">
          <label>Opinión (opcional)</label>
          <div class="stars-input">
            <button
              v-for="n in 5" :key="n"
              class="star-btn"
              :class="{ active: n <= pagoOpCal }"
              @click="pagoOpCal = pagoOpCal === n ? 0 : n"
            >★</button>
            <span v-if="pagoOpCal" class="muted" style="font-size:0.8rem;align-self:center">
              {{ pagoOpCal }} estrella{{ pagoOpCal !== 1 ? 's' : '' }}
            </span>
          </div>
          <textarea
            v-if="pagoOpCal"
            v-model="pagoOpComent"
            rows="2"
            placeholder="¿Cómo fue tu experiencia? (opcional)"
            style="margin-top:0.5rem"
          />
        </div>

        <p v-if="errorMsg" class="msg-error">{{ errorMsg }}</p>
        <div class="modal-actions">
          <PrimaryButton :loading="pagoSaving" @click="confirmarPago">Confirmar pago</PrimaryButton>
          <PrimaryButton variant="ghost" @click="cerrarPago">Cancelar</PrimaryButton>
        </div>
      </div>
    </div>

    <!-- ── Opinion modal ─────────────────────────────────────── -->
    <div v-if="opinionCita" class="modal-overlay" @click.self="opinionCita = null">
      <div class="modal">
        <h3>Calificar servicio</h3>
        <p class="muted">{{ opinionCita.servicio_nombre }} · {{ formatFecha(opinionCita.fecha_cita) }}</p>
        <div class="stars-input">
          <button
            v-for="n in 5" :key="n"
            class="star-btn"
            :class="{ active: n <= opinionCal }"
            @click="opinionCal = n"
          >★</button>
        </div>
        <div class="field">
          <label>Comentario (opcional)</label>
          <textarea v-model="opinionComentario" rows="3" placeholder="¿Cómo fue tu experiencia?" />
        </div>
        <p v-if="errorMsg" class="msg-error">{{ errorMsg }}</p>
        <div class="modal-actions">
          <PrimaryButton :loading="opinionSaving" @click="enviarOpinion">Enviar opinión</PrimaryButton>
          <PrimaryButton variant="ghost" @click="opinionCita = null">Cancelar</PrimaryButton>
        </div>
      </div>
    </div>

    <!-- ── Cancellation dialog ─────────────────────────────── -->
    <div v-if="cancelId" class="confirm-banner">
      <div>
        <p><b>¿Cancelar esta cita?</b></p>
        <div class="field">
          <label>Motivo (opcional)</label>
          <input v-model="cancelMotivo" placeholder="Ej. No puedo asistir ese día..." />
        </div>
      </div>
      <div class="confirm-actions">
        <PrimaryButton variant="danger" size="sm" :loading="cancelling" @click="confirmCancel">
          Confirmar cancelación
        </PrimaryButton>
        <PrimaryButton variant="ghost" size="sm" @click="cancelId = null">
          Volver
        </PrimaryButton>
      </div>
    </div>

    <!-- ── List ─────────────────────────────────────────────── -->
    <AppCard :title="`Mis citas (${citas.length})`" no-padding>
      <div v-if="loading" class="state">Cargando citas…</div>
      <div v-else-if="!citas.length" class="state">
        No tienes citas registradas.
        <router-link to="/solicitar-cita"> ¡Solicita tu primera cita!</router-link>
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mascota</th>
              <th>Servicio</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in citas" :key="c.id_cita">
              <td><b>{{ c.mascota_nombre || '—' }}</b></td>
              <td>
                {{ c.servicio_nombre || '—' }}
                <br v-if="c.duracion_estimada_min" />
                <small v-if="c.duracion_estimada_min" class="muted">{{ c.duracion_estimada_min }} min</small>
              </td>
              <td>{{ formatFecha(c.fecha_cita) }}</td>
              <td>{{ formatHora(c.hora_inicio) }}</td>
              <td>
                <span class="badge" :class="estadoBadgeClass(c.estado_global)">
                  {{ estadoLabel(c.estado_global) }}
                </span>
              </td>
              <td class="actions-cell">
                <button
                  v-if="isCancelable(c)"
                  class="link-btn danger"
                  @click="askCancel(c.id_cita)"
                >
                  Cancelar
                </button>
                <button
                  v-if="c.estado_global === 'completada'"
                  class="link-btn"
                  @click="router.push({ name: 'cliente-ficha-grooming', params: { idCita: c.id_cita } })"
                >
                  Ver ficha
                </button>
                <button
                  v-if="c.estado_global === 'completada' && !c.pagado"
                  class="link-btn pagar-btn"
                  @click="abrirPago(c)"
                >
                  Pagar
                </button>
                <span
                  v-if="c.estado_global === 'completada' && c.pagado"
                  class="badge badge-pagada"
                >✓ Pagada</span>
                <button
                  v-if="c.estado_global === 'completada' && c.pagado && !opiniadasIds.has(c.id_cita)"
                  class="link-btn accent"
                  @click="abrirOpinion(c)"
                >
                  Opinar
                </button>
                <span
                  v-if="c.estado_global === 'completada' && opiniadasIds.has(c.id_cita)"
                  class="muted small"
                >Ya opinaste</span>
                <span v-if="!isCancelable(c) && c.estado_global !== 'completada'" class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.citas-page { display: flex; flex-direction: column; gap: 1.25rem; }
.muted { color: var(--color-text-soft); }
.page-header h2 { margin: 0 0 0.25rem 0; }

.top-actions { display: flex; justify-content: flex-end; }

.confirm-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: var(--radius-md);
}
.confirm-banner p { margin: 0 0 0.5rem 0; }
.confirm-actions { display: flex; gap: 0.5rem; flex-shrink: 0; padding-top: 0.25rem; }
.confirm-banner .field { margin-bottom: 0; min-width: 280px; }

.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.table-wrapper { overflow-x: auto; }

.actions-cell { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.link-btn {
  background: none;
  border: 1px solid var(--color-card-border);
  color: var(--color-text);
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.link-btn:hover { background: var(--color-bg-soft); }
.link-btn.danger { border-color: var(--color-danger); color: var(--color-danger); }
.link-btn.danger:hover { background: #fee2e2; }
.link-btn.accent { border-color: var(--color-accent); color: var(--color-accent); }
.link-btn.accent:hover { background: #fef3c7; }
.small { font-size: 0.75rem; }

/* Opinion modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: #fff; border-radius: var(--radius-lg); padding: 1.75rem;
  width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 1rem;
  box-shadow: var(--shadow-md);
}
.modal h3 { margin: 0; }
.modal .muted { margin: 0; font-size: 0.9rem; }
.modal-actions { display: flex; gap: 0.75rem; }

.stars-input { display: flex; gap: 0.35rem; }
.star-btn {
  background: none; border: none; font-size: 2rem; cursor: pointer;
  color: #d1d5db; line-height: 1; padding: 0;
}
.star-btn.active { color: #f59e0b; }
.star-btn:hover  { color: #f59e0b; }

.msg-error { color: var(--color-danger); margin: 0; font-size: 0.875rem; }

/* Payment modal */
.pago-modal { max-width: 480px; }
.pago-resumen {
  display: flex; flex-direction: column; gap: 0.5rem;
  background: #f8fafc; border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md); padding: 1rem;
}
.pago-resumen-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.monto-total { font-size: 1.4rem; color: #16a34a; }

.metodo-radios { display: flex; gap: 0.75rem; flex-wrap: wrap; padding-top: 0.25rem; }
.radio-label {
  display: flex; align-items: center; gap: 0.4rem;
  font-weight: 600; cursor: pointer; font-size: 0.92rem;
  padding: 0.45rem 0.85rem; border-radius: 999px;
  border: 1px solid var(--color-card-border); transition: all .15s;
}
.radio-label.selected { border-color: var(--color-primary); background: #eff6ff; color: var(--color-primary); }
.radio-label input { accent-color: var(--color-primary); width: 14px; height: 14px; }

.qr-section { display: flex; flex-direction: column; gap: 0.5rem; }
.qr-box {
  background: #f0fdf4; border: 1px dashed #16a34a;
  border-radius: var(--radius-md); padding: 1.25rem; text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.qr-wrapper {
  position: relative; display: inline-block;
  border-radius: 8px; overflow: visible;
  box-shadow: 0 2px 12px rgba(21,128,61,.18);
}
.qr-wrapper img { display: block; border-radius: 6px; }
.qr-paw-overlay {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: #ffffff; border-radius: 6px;
  padding: 3px 5px; font-size: 1.35rem; line-height: 1;
  box-shadow: 0 0 0 4px #ffffff;
  pointer-events: none;
}
.qr-generating {
  width: 200px; height: 200px;
  display: flex; align-items: center; justify-content: center;
  color: #15803d; font-size: 0.85rem;
  border: 2px dashed #86efac; border-radius: 6px;
}

.opinion-opt { margin-top: 0.25rem; }
.pagar-btn { border-color: #16a34a; color: #16a34a; font-weight: 700; }
.pagar-btn:hover { background: #f0fdf4; }
.badge-pagada { background: #dcfce7; color: #15803d; font-size: 0.78rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 700; }
</style>
