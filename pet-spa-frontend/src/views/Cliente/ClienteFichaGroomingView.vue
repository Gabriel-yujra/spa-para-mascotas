<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { groomingApi } from '@/api/groomingApi';
import AppCard from '@/components/AppCard.vue';

const route  = useRoute();
const router = useRouter();

const idCita      = route.params.idCita;
const loading     = ref(false);
const errorMsg    = ref('');
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
            <img v-if="mascota?.foto_url" :src="mascota.foto_url" :alt="mascota.nombre" class="pet-photo" />
            <div v-else class="pet-avatar-placeholder">🐾</div>
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
      <AppCard v-if="fotos.length" title="Fotos del servicio">
        <div class="fotos-grid">
          <div v-for="foto in fotos" :key="foto.id_foto" class="foto-item">
            <img :src="foto.url_foto" :alt="foto.tipo" class="foto-img" />
            <span class="foto-tipo">{{ foto.tipo }}</span>
          </div>
        </div>
      </AppCard>

    </template>
  </div>
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
.pet-avatar-placeholder {
  width: 64px; height: 64px;
  background: var(--color-bg-soft);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem;
  flex-shrink: 0;
}
.pet-photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid var(--color-card-border); }
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
.fotos-grid { display: flex; flex-wrap: wrap; gap: 0.85rem; }
.foto-item  { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
.foto-img   { width: 160px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-card-border); }
.foto-tipo  { font-size: 0.75rem; font-weight: 700; color: var(--color-text-soft); text-transform: capitalize; }

.center { text-align: center; padding: 1.5rem; }
</style>
