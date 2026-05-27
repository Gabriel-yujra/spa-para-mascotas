<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { groomingApi } from '@/api/groomingApi';
import AppCard from '@/components/AppCard.vue';

const BACKEND_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/api\/?$/, '');

const route  = useRoute();
const router = useRouter();

const idCita   = route.params.idCita;

const mascota  = ref(null);
const ficha    = ref(null);
const citaInfo = ref(null);
const checklist = ref([]);
const fotos    = ref([]);
const loading  = ref(false);
const errorMsg = ref('');
const lightboxSrc = ref(null);

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

function formatFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

async function loadFicha() {
  loading.value  = true;
  errorMsg.value = '';
  try {
    const data = await groomingApi.getFichaAdmin(idCita);
    mascota.value   = data.mascota   || null;
    ficha.value     = data.ficha     || null;
    citaInfo.value  = data.cita      || null;
    checklist.value = data.checklist || [];
    fotos.value     = data.fotos     || [];
  } catch (err) {
    if (err.response?.status === 404) {
      errorMsg.value = 'Cita no encontrada.';
    } else {
      errorMsg.value = err.response?.data?.error || 'Error al cargar la ficha';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadFicha);
</script>

<template>
  <div class="ficha-page">
    <div class="back-row">
      <button class="back-btn" @click="router.back()">← Volver</button>
    </div>

    <p v-if="loading" class="muted center">Cargando…</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <template v-if="!loading && citaInfo">

      <!-- ── Encabezado de cita ──────────────────────────────── -->
      <div class="cita-bar">
        <span class="cita-servicio">{{ citaInfo.servicio_nombre || 'Servicio' }}</span>
        <span class="muted">{{ formatFecha(citaInfo.fecha_cita) }}</span>
        <span class="badge" :class="estadoBadgeClass(citaInfo.estado_global)">
          {{ ESTADO_LABELS[citaInfo.estado_global] || citaInfo.estado_global }}
        </span>
        <span class="readonly-badge">Solo lectura</span>
      </div>

      <!-- ── Mascota ─────────────────────────────────────────── -->
      <AppCard title="Mascota">
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
        </div>
      </AppCard>

      <!-- ── Sin ficha aún ──────────────────────────────────── -->
      <AppCard v-if="!ficha">
        <p class="muted center">El groomer aún no ha registrado la ficha para esta cita.</p>
      </AppCard>

      <template v-else>

        <!-- ── Checklist ─────────────────────────────────────── -->
        <AppCard title="Checklist de servicios">
          <div v-if="!checklist.length" class="muted center">Sin ítems registrados.</div>
          <div v-else class="checklist-grid">
            <div
              v-for="item in checklist"
              :key="item.id_item"
              class="check-item"
              :class="{ 'check-item--done': item.realizado, 'check-item--no': !item.realizado }"
            >
              <span class="check-icon">{{ item.realizado ? '✔' : '✗' }}</span>
              <span class="check-nombre">{{ item.nombre }}</span>
            </div>
          </div>
        </AppCard>

        <!-- ── Ficha técnica ────────────────────────────────── -->
        <AppCard title="Ficha técnica">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Tamaño verificado</span>
              <span class="detail-value">{{ tamanoLabel(ficha.tamano_mascota) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Temperatura</span>
              <span class="detail-value">{{ ficha.temperatura != null ? `${ficha.temperatura} °C` : '—' }}</span>
            </div>
            <div class="detail-item detail-item--full">
              <span class="detail-label">Estado de ingreso</span>
              <span class="detail-value pre-wrap">{{ ficha.estado_ingreso || '—' }}</span>
            </div>
            <div class="detail-item detail-item--full">
              <span class="detail-label">Observaciones</span>
              <span class="detail-value pre-wrap">{{ ficha.observaciones || '—' }}</span>
            </div>
            <div class="detail-item detail-item--full">
              <span class="detail-label">Recomendaciones para el dueño</span>
              <span class="detail-value pre-wrap">{{ ficha.recomendaciones || '—' }}</span>
            </div>
            <div class="detail-item detail-item--full">
              <span class="detail-label">Notas internas del groomer</span>
              <span class="detail-value pre-wrap">{{ ficha.notas_internas || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Fecha de cierre</span>
              <span class="detail-value">{{ ficha.fecha_cierre ? formatFecha(ficha.fecha_cierre) : '—' }}</span>
            </div>
          </div>
        </AppCard>

        <!-- ── Fotos ────────────────────────────────────────── -->
        <AppCard v-if="fotos.length" title="Fotos del servicio">
          <div class="fotos-grid">
            <div v-for="foto in fotos" :key="foto.id_foto" class="foto-item">
              <img
                :src="`${BACKEND_URL}${foto.url_foto}`"
                :alt="foto.tipo"
                class="foto-img foto-clickable"
                @click="lightboxSrc = `${BACKEND_URL}${foto.url_foto}`"
              />
              <span class="foto-tipo">{{ foto.tipo === 'llegada' ? '📥 Llegada' : foto.tipo === 'salida' ? '📤 Salida' : foto.tipo }}</span>
            </div>
          </div>
        </AppCard>

      </template>
    </template>
  </div>

  <!-- ── Lightbox ─────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="lightboxSrc" class="lightbox-overlay" @click="lightboxSrc = null">
      <button class="lightbox-close" @click.stop="lightboxSrc = null">✕</button>
      <img :src="lightboxSrc" class="lightbox-img" @click.stop />
    </div>
  </Teleport>
</template>

<style scoped>
.ficha-page { display: flex; flex-direction: column; gap: 1.25rem; }

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
  flex-wrap: wrap;
}
.cita-servicio { font-weight: 700; font-size: 1rem; }
.readonly-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

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
.detail-value { font-size: 0.92rem; color: var(--color-text); font-weight: 500; }
.pre-wrap { white-space: pre-wrap; }

.checklist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid var(--color-card-border);
}
.check-item--done { background: #f0fdf4; border-color: #86efac; color: #166534; }
.check-item--no   { background: #fafafa; color: var(--color-text-soft); }
.check-icon { font-size: 0.85rem; }

.fotos-grid { display: flex; flex-wrap: wrap; gap: 0.85rem; }
.foto-item  { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
.foto-img   { width: 160px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-card-border); }
.foto-tipo  { font-size: 0.75rem; font-weight: 700; color: var(--color-text-soft); }
.foto-clickable { cursor: zoom-in; }

/* ── Lightbox ── */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: zoom-out;
}
.lightbox-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  cursor: default;
}
.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  font-size: 1.25rem;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.lightbox-close:hover { background: rgba(255,255,255,0.3); }

.center { text-align: center; padding: 1.5rem; }
</style>
