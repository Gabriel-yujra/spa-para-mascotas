<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { groomingApi } from '@/api/groomingApi';
import AppCard from '@/components/AppCard.vue';
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

const idCita      = route.params.idCita;
const loading     = ref(false);
const errorMsg    = ref('');
const lightboxSrc = ref(null);
const mascota     = ref(null);
const resumen     = ref(null);
const checklist   = ref([]);
const fotos       = ref([]);
const servicio    = ref('');
const fechaCita   = ref('');

const checklistHecho   = computed(() => checklist.value.filter(i => i.realizado));
const checklistPendiente = computed(() => checklist.value.filter(i => !i.realizado));

function formatFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function tamanoLabel(t) {
  return { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande', gigante: 'Gigante' }[t] || t || '—';
}

async function loadFicha() {
  loading.value  = true;
  errorMsg.value = '';
  try {
    const data    = await groomingApi.getFichaCliente(idCita);
    mascota.value   = data.mascota        || null;
    resumen.value   = data.resumen        || null;
    checklist.value = data.checklist      || [];
    fotos.value     = data.fotos          || [];
    servicio.value  = data.servicio_nombre || '';
    fechaCita.value = data.fecha_cita      || '';
  } catch (err) {
    if (err.response?.status === 403) {
      errorMsg.value = err.response.data?.error || 'No tienes acceso a esta ficha.';
    } else if (err.response?.status === 404) {
      errorMsg.value = 'Cita no encontrada.';
    } else {
      errorMsg.value = err.response?.data?.error || 'Error al cargar el resumen';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadFicha);
</script>

<template>
  <div class="ficha-cliente-page">
    <div class="back-row">
      <button class="back-btn" @click="router.back()">← Mis citas</button>
    </div>

    <p v-if="loading" class="muted center">Cargando…</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <template v-if="!loading && !errorMsg">

      <!-- ── Encabezado del servicio ────────────────────────── -->
      <div class="service-header">
        <div class="service-title">{{ servicio || 'Servicio de grooming' }}</div>
        <div class="service-date">{{ formatFecha(fechaCita) }}</div>
      </div>

      <!-- ── Mascota ─────────────────────────────────────────── -->
      <AppCard title="Tu mascota">
        <div class="pet-summary">
          <div class="pet-avatar">
            <img :src="mascotaFotoSrc(mascota)" :alt="mascota?.nombre" class="pet-photo" />
          </div>
          <div class="pet-info">
            <p class="pet-name">{{ mascota?.nombre || '—' }}</p>
            <p class="pet-detail">
              {{ [mascota?.especie, mascota?.raza].filter(Boolean).join(' · ') || '—' }}
            </p>
            <p class="pet-detail">Tamaño: {{ tamanoLabel(mascota?.tamano) }}</p>
          </div>
        </div>
      </AppCard>

      <!-- ── Checklist de lo que se realizó ────────────────── -->
      <AppCard title="Servicios realizados">
        <div v-if="!checklist.length" class="muted center">Sin detalle de servicios.</div>
        <div v-else>
          <div v-if="checklistHecho.length" class="service-list">
            <div
              v-for="item in checklistHecho"
              :key="item.id_item"
              class="service-pill service-pill--done"
            >
              ✔ {{ item.nombre }}
            </div>
          </div>
          <div v-if="checklistPendiente.length" class="service-list service-list--gap">
            <div
              v-for="item in checklistPendiente"
              :key="item.id_item"
              class="service-pill service-pill--skipped"
            >
              — {{ item.nombre }}
            </div>
          </div>
        </div>
      </AppCard>

      <!-- ── Recomendaciones ────────────────────────────────── -->
      <AppCard title="Recomendaciones del groomer">
        <p v-if="resumen?.recomendaciones" class="recomendaciones-text">
          {{ resumen.recomendaciones }}
        </p>
        <p v-else class="muted center">Sin recomendaciones registradas.</p>
      </AppCard>

      <!-- ── Fotos ──────────────────────────────────────────── -->
      <AppCard v-if="fotos.length" title="Antes y después">
        <div class="fotos-antes-despues">
          <template v-for="tipo in ['llegada', 'salida']" :key="tipo">
            <div
              v-if="fotos.find(f => f.tipo === tipo)"
              class="foto-ad-item"
            >
              <span class="foto-ad-label">
                {{ tipo === 'llegada' ? '📥 Antes' : '📤 Después' }}
              </span>
              <img
                :src="`${BACKEND_URL}${fotos.find(f => f.tipo === tipo).url_foto}`"
                :alt="tipo"
                class="foto-ad-img foto-clickable"
                @click="lightboxSrc = `${BACKEND_URL}${fotos.find(f => f.tipo === tipo).url_foto}`"
              />
            </div>
          </template>
          <!-- Any other photo types (in case there are extras) -->
          <template v-for="foto in fotos.filter(f => f.tipo !== 'llegada' && f.tipo !== 'salida')" :key="foto.id_foto">
            <div class="foto-ad-item">
              <span class="foto-ad-label">{{ foto.tipo }}</span>
              <img :src="`${BACKEND_URL}${foto.url_foto}`" :alt="foto.tipo" class="foto-ad-img foto-clickable" @click="lightboxSrc = `${BACKEND_URL}${foto.url_foto}`" />
            </div>
          </template>
        </div>
      </AppCard>

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
.ficha-cliente-page { display: flex; flex-direction: column; gap: 1.25rem; }

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

.service-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.service-title { font-size: 1.25rem; font-weight: 800; color: var(--color-text); }
.service-date  { font-size: 0.9rem; color: var(--color-text-soft); font-weight: 600; }

/* ── Pet summary ── */
.pet-summary { display: flex; gap: 1rem; align-items: center; }
.pet-photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid var(--color-card-border); background: var(--color-bg-soft); }
.pet-name   { font-size: 1.05rem; font-weight: 800; margin: 0 0 0.15rem 0; }
.pet-detail { font-size: 0.88rem; color: var(--color-text-soft); margin: 0; }

/* ── Checklist pills ── */
.service-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.service-list--gap { margin-top: 0.6rem; }
.service-pill {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
  border: 1px solid transparent;
}
.service-pill--done    { background: #f0fdf4; border-color: #86efac; color: #166534; }
.service-pill--skipped { background: #f8fafc; border-color: #e2e8f0; color: #94a3b8; }

/* ── Recomendaciones ── */
.recomendaciones-text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap;
  margin: 0;
}

/* ── Fotos ── */
.fotos-antes-despues {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.foto-ad-item { display: flex; flex-direction: column; gap: 0.4rem; }
.foto-ad-label { font-size: 0.88rem; font-weight: 700; color: var(--color-text-soft); }
.foto-ad-img   { width: 100%; height: 160px; object-fit: cover; border-radius: 10px; border: 1px solid var(--color-card-border); }
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
