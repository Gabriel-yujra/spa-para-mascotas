<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { citaApi }   from '@/api/citaApi';
import { opinionApi } from '@/api/opinionApi';
import AppCard       from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const router     = useRouter();
const citas      = ref([]);
const loading    = ref(false);
const errorMsg   = ref('');
const successMsg = ref('');

// Cancelation
const cancelId       = ref(null);
const cancelMotivo   = ref('');
const cancelling     = ref(false);

// Opinión
const opinionCita      = ref(null);   // cita sobre la que se opina
const opinionCal       = ref(0);      // calificación seleccionada 1-5
const opinionComentario = ref('');
const opinionSaving    = ref(false);
const opiniadasIds     = ref(new Set()); // IDs de citas ya opinadas

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
              <td>{{ c.servicio_nombre || '—' }}</td>
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
                  v-if="c.estado_global === 'completada' && !opiniadasIds.has(c.id_cita)"
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
</style>
