<script setup>
import { ref, onMounted } from 'vue';
import { mascotaApi } from '@/api/mascotaApi';
import AppCard from '@/components/AppCard.vue';
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

// ── Photo modal ───────────────────────────────────────────────
const photoModal = ref(null); // { src, nombre }
function openPhotoModal(m) {
  if (!m.foto_url) return;
  photoModal.value = { src: mascotaFotoSrc(m), nombre: m.nombre };
}
function closePhotoModal() { photoModal.value = null; }

// ── Vacunas panel ─────────────────────────────────────────────
const vacunasMascota    = ref(null);   // mascota seleccionada para ver vacunas
const vacunas           = ref([]);
const catalogo          = ref([]);
const loadingVacunas    = ref(false);
const savingVacuna      = ref(false);
const deletingVacunaId  = ref(null);
const vacunaErrorMsg    = ref('');
const vacunaSuccessMsg  = ref('');

const emptyVacunaForm = () => ({ id_vacuna: '', fecha_aplicacion: '', fecha_proxima: '', observaciones: '' });
const vacunaForm = ref(emptyVacunaForm());

async function loadCatalogo() {
  try {
    const data = await mascotaApi.getVacunasCatalogo();
    catalogo.value = data.vacunas || [];
  } catch { catalogo.value = []; }
}

async function openVacunas(m) {
  vacunasMascota.value  = m;
  vacunas.value         = [];
  vacunaForm.value      = emptyVacunaForm();
  vacunaErrorMsg.value  = '';
  vacunaSuccessMsg.value = '';
  loadingVacunas.value  = true;
  try {
    const data = await mascotaApi.getVacunasMascota(m.id_mascota);
    vacunas.value = data.vacunas || [];
  } catch (err) {
    vacunaErrorMsg.value = err.response?.data?.error || 'Error al cargar vacunas';
  } finally {
    loadingVacunas.value = false;
  }
}

function closeVacunas() {
  vacunasMascota.value = null;
  vacunas.value = [];
}

async function onAddVacuna() {
  vacunaErrorMsg.value   = '';
  vacunaSuccessMsg.value = '';
  if (!vacunaForm.value.id_vacuna)         { vacunaErrorMsg.value = 'Selecciona una vacuna'; return; }
  if (!vacunaForm.value.fecha_aplicacion)  { vacunaErrorMsg.value = 'La fecha de aplicación es obligatoria'; return; }
  savingVacuna.value = true;
  try {
    const data = await mascotaApi.createVacunaMascota(vacunasMascota.value.id_mascota, {
      id_vacuna:        vacunaForm.value.id_vacuna,
      fecha_aplicacion: vacunaForm.value.fecha_aplicacion,
      fecha_proxima:    vacunaForm.value.fecha_proxima || null,
      observaciones:    vacunaForm.value.observaciones.trim() || null,
    });
    vacunas.value.unshift({ ...data.vacuna, nombre_vacuna: catalogo.value.find(v => v.id_vacuna === data.vacuna.id_vacuna)?.nombre });
    vacunaForm.value      = emptyVacunaForm();
    vacunaSuccessMsg.value = '✅ Vacuna registrada';
    // recargo para obtener nombre_vacuna del JOIN
    const refreshed = await mascotaApi.getVacunasMascota(vacunasMascota.value.id_mascota);
    vacunas.value = refreshed.vacunas || [];
  } catch (err) {
    vacunaErrorMsg.value = err.response?.data?.error || 'Error al registrar vacuna';
  } finally {
    savingVacuna.value = false;
  }
}

async function onDeleteVacuna(idMascotaVacuna) {
  vacunaErrorMsg.value   = '';
  vacunaSuccessMsg.value = '';
  deletingVacunaId.value = idMascotaVacuna;
  try {
    await mascotaApi.deleteVacunaMascota(vacunasMascota.value.id_mascota, idMascotaVacuna);
    vacunas.value = vacunas.value.filter(v => v.id_mascota_vacuna !== idMascotaVacuna);
    vacunaSuccessMsg.value = '✅ Vacuna eliminada';
  } catch (err) {
    vacunaErrorMsg.value = err.response?.data?.error || 'Error al eliminar vacuna';
  } finally {
    deletingVacunaId.value = null;
  }
}

function formatFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const mascotas = ref([]);
const loading  = ref(false);
const errorMsg  = ref('');
const successMsg = ref('');

// ── Form state ────────────────────────────────────────────────
const showForm    = ref(false);
const editingId   = ref(null);   // null = crear, uuid = editar
const saving      = ref(false);
const selectedFile = ref(null);

const emptyForm = () => ({
  nombre: '',
  especie: '',
  raza: '',
  tamano: '',
  fecha_nacimiento: '',
  temperamento: '',
  alergias: '',
  restricciones: '',
  notas: '',
});
const form = ref(emptyForm());

// ── Confirmación de borrado ───────────────────────────────────
const confirmDeleteId = ref(null);
const deleting        = ref(false);

// ─────────────────────────────────────────────────────────────
async function loadMascotas() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await mascotaApi.getMisMascotas();
    mascotas.value = data.mascotas || [];
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar mascotas';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = emptyForm();
  selectedFile.value = null;
  successMsg.value = '';
  errorMsg.value = '';
  showForm.value = true;
}

function openEdit(m) {
  editingId.value = m.id_mascota;
  form.value = {
    nombre:          m.nombre || '',
    especie:         m.especie || '',
    raza:            m.raza || '',
    tamano:          m.tamano || '',
    fecha_nacimiento: m.fecha_nacimiento ? m.fecha_nacimiento.slice(0, 10) : '',
    temperamento:    m.temperamento || '',
    alergias:        m.alergias || '',
    restricciones:   m.restricciones || '',
    notas:           m.notas || '',
  };
  successMsg.value = '';
  errorMsg.value = '';
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  editingId.value = null;
  selectedFile.value = null;
}

async function onSubmit() {
  errorMsg.value = '';
  if (!form.value.nombre.trim()) {
    errorMsg.value = 'El nombre es obligatorio';
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form.value };
    if (!payload.fecha_nacimiento) delete payload.fecha_nacimiento;

    let idMascota;
    if (editingId.value) {
      await mascotaApi.updateMascota(editingId.value, payload);
      idMascota = editingId.value;
      successMsg.value = '✅ Mascota actualizada';
    } else {
      const result = await mascotaApi.createMascota(payload);
      idMascota = result.mascota?.id_mascota;
      successMsg.value = '✅ Mascota registrada';
    }

    if (selectedFile.value && idMascota) {
      try {
        await mascotaApi.uploadMascotaFoto(idMascota, selectedFile.value);
      } catch {
        successMsg.value += ' (la foto no pudo subirse, inténtalo de nuevo)';
      }
    }

    showForm.value = false;
    editingId.value = null;
    selectedFile.value = null;
    await loadMascotas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || err.response?.data?.message || 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

function askDelete(id) {
  confirmDeleteId.value = id;
  errorMsg.value = '';
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await mascotaApi.deleteMascota(confirmDeleteId.value);
    successMsg.value = '🗑️ Mascota eliminada';
    confirmDeleteId.value = null;
    await loadMascotas();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se pudo eliminar';
    confirmDeleteId.value = null;
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  loadMascotas();
  loadCatalogo();
});
</script>

<template>
  <div class="mascotas-page">
    <header class="page-header">
      <h2>🐾 Mis mascotas</h2>
      <p class="muted">Administra el perfil de tus mascotas</p>
    </header>

    <p v-if="errorMsg"  class="error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="success">{{ successMsg }}</p>

    <!-- ── Confirm delete banner ────────────────────────────── -->
    <div v-if="confirmDeleteId" class="confirm-banner">
      <span>¿Eliminar esta mascota? Esta acción no se puede deshacer.</span>
      <div class="confirm-actions">
        <PrimaryButton variant="danger" size="sm" :loading="deleting" @click="confirmDelete">
          Sí, eliminar
        </PrimaryButton>
        <PrimaryButton variant="ghost" size="sm" @click="confirmDeleteId = null">
          Cancelar
        </PrimaryButton>
      </div>
    </div>

    <!-- ── Add button ───────────────────────────────────────── -->
    <div class="top-actions">
      <PrimaryButton v-if="!showForm" @click="openCreate">
        + Agregar mascota
      </PrimaryButton>
    </div>

    <!-- ── Create / Edit form ───────────────────────────────── -->
    <AppCard
      v-if="showForm"
      :title="editingId ? 'Editar mascota' : 'Nueva mascota'"
      variant="accent"
    >
      <form @submit.prevent="onSubmit">
        <div class="form-grid">
          <div class="field">
            <label>Nombre *</label>
            <input v-model="form.nombre" placeholder="Nombre de tu mascota" required />
          </div>
          <div class="field">
            <label>Especie</label>
            <select v-model="form.especie">
              <option value="">Selecciona...</option>
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="field">
            <label>Raza</label>
            <input v-model="form.raza" placeholder="Ej. Labrador, Siamés..." />
          </div>
          <div class="field">
            <label>Tamaño</label>
            <select v-model="form.tamano">
              <option value="">Selecciona...</option>
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
              <option value="gigante">Gigante</option>
            </select>
          </div>
          <div class="field">
            <label>Fecha de nacimiento</label>
            <input v-model="form.fecha_nacimiento" type="date" />
          </div>
          <div class="field">
            <label>Temperamento</label>
            <input v-model="form.temperamento" placeholder="Ej. Tranquilo, activo..." />
          </div>
          <div class="field field--full">
            <label>Alergias conocidas</label>
            <textarea
              v-model="form.alergias"
              rows="2"
              placeholder="Ej. shampoo con parabenos, penicilina, látex..."
            />
            <span class="field-hint">Productos o medicamentos que no se pueden usar</span>
          </div>
          <div class="field field--full">
            <label>Restricciones médicas o de comportamiento</label>
            <textarea
              v-model="form.restricciones"
              rows="2"
              placeholder="Ej. problemas cardíacos, agresivo con extraños, no puede estar de pie mucho tiempo..."
            />
            <span class="field-hint">Condiciones de salud o comportamiento que el groomer debe conocer</span>
          </div>
          <div class="field field--full">
            <label>Foto de la mascota</label>
            <input
              type="file"
              accept="image/*"
              class="file-input"
              @change="e => selectedFile = e.target.files[0] || null"
            />
            <span class="field-hint">Opcional · JPG, PNG, WEBP · máx. 5 MB</span>
          </div>
          <div class="field field--full">
            <label>Notas adicionales</label>
            <textarea v-model="form.notas" rows="2" placeholder="Cualquier otra información relevante..." />
          </div>
        </div>

        <div class="form-actions">
          <PrimaryButton type="submit" :loading="saving">
            {{ saving ? 'Guardando…' : (editingId ? 'Guardar cambios' : 'Registrar mascota') }}
          </PrimaryButton>
          <PrimaryButton type="button" variant="ghost" @click="cancelForm">
            Cancelar
          </PrimaryButton>
        </div>
      </form>
    </AppCard>

    <!-- ── Photo modal ────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="photoModal" class="photo-overlay" @click.self="closePhotoModal">
        <div class="photo-modal">
          <button class="photo-modal__close" @click="closePhotoModal">✕</button>
          <img :src="photoModal.src" :alt="photoModal.nombre" class="photo-modal__img" />
          <p class="photo-modal__nombre">{{ photoModal.nombre }}</p>
        </div>
      </div>
    </Teleport>

    <!-- ── List ─────────────────────────────────────────────── -->
    <AppCard :title="`Mis mascotas (${mascotas.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!mascotas.length" class="state">
        Aún no tienes mascotas registradas. ¡Agrega la primera!
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Nombre</th>
              <th>Especie</th>
              <th>Raza</th>
              <th>Tamaño</th>
              <th>Temperamento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in mascotas" :key="m.id_mascota">
              <td class="avatar-cell">
                <img
                  :src="mascotaFotoSrc(m)"
                  :alt="m.nombre"
                  class="mascota-avatar"
                  :class="{ 'mascota-avatar--clickable': !!m.foto_url }"
                  @click="openPhotoModal(m)"
                />
              </td>
              <td><b>{{ m.nombre }}</b></td>
              <td>{{ m.especie || '—' }}</td>
              <td>{{ m.raza || '—' }}</td>
              <td>
                <span v-if="m.tamano" class="badge">{{ m.tamano }}</span>
                <span v-else>—</span>
              </td>
              <td>{{ m.temperamento || '—' }}</td>
              <td class="actions-cell">
                <button class="link-btn" @click="openEdit(m)">Editar</button>
                <button
                  class="link-btn"
                  :class="{ active: vacunasMascota?.id_mascota === m.id_mascota }"
                  @click="vacunasMascota?.id_mascota === m.id_mascota ? closeVacunas() : openVacunas(m)"
                >💉 Vacunas</button>
                <button class="link-btn danger" @click="askDelete(m.id_mascota)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <!-- ── Vacunas panel ─────────────────────────────────────── -->
    <AppCard
      v-if="vacunasMascota"
      :title="`💉 Vacunas de ${vacunasMascota.nombre}`"
      variant="soft"
    >
      <p v-if="vacunaErrorMsg"   class="error">{{ vacunaErrorMsg }}</p>
      <p v-if="vacunaSuccessMsg" class="success">{{ vacunaSuccessMsg }}</p>

      <!-- Lista de vacunas -->
      <div v-if="loadingVacunas" class="state">Cargando vacunas…</div>
      <div v-else-if="!vacunas.length" class="state vacunas-empty">
        No hay vacunas registradas para esta mascota.
      </div>
      <div v-else class="vacunas-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Vacuna</th>
              <th>Aplicación</th>
              <th>Próxima dosis</th>
              <th>Observaciones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in vacunas" :key="v.id_mascota_vacuna">
              <td><b>{{ v.nombre_vacuna }}</b></td>
              <td>{{ formatFecha(v.fecha_aplicacion) }}</td>
              <td>{{ formatFecha(v.fecha_proxima) }}</td>
              <td class="obs-cell">{{ v.observaciones || '—' }}</td>
              <td>
                <button
                  class="link-btn danger"
                  :disabled="deletingVacunaId === v.id_mascota_vacuna"
                  @click="onDeleteVacuna(v.id_mascota_vacuna)"
                >
                  {{ deletingVacunaId === v.id_mascota_vacuna ? '…' : 'Eliminar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Formulario para agregar vacuna -->
      <div class="vacuna-form">
        <h4 class="vacuna-form__title">Registrar nueva vacuna</h4>
        <div class="form-grid">
          <div class="field">
            <label>Vacuna <span class="required">*</span></label>
            <select v-model="vacunaForm.id_vacuna">
              <option value="" disabled>Selecciona una vacuna…</option>
              <option
                v-for="c in catalogo"
                :key="c.id_vacuna"
                :value="c.id_vacuna"
              >{{ c.nombre }}</option>
            </select>
          </div>
          <div class="field">
            <label>Fecha de aplicación <span class="required">*</span></label>
            <input v-model="vacunaForm.fecha_aplicacion" type="date" />
          </div>
          <div class="field">
            <label>Próxima dosis</label>
            <input v-model="vacunaForm.fecha_proxima" type="date" />
          </div>
          <div class="field field--wide">
            <label>Observaciones</label>
            <input v-model="vacunaForm.observaciones" type="text" placeholder="Reacciones, lote, clínica…" />
          </div>
        </div>
        <div class="form-actions">
          <PrimaryButton :loading="savingVacuna" @click="onAddVacuna">
            {{ savingVacuna ? 'Guardando…' : 'Agregar vacuna' }}
          </PrimaryButton>
          <PrimaryButton variant="ghost" @click="closeVacunas">Cerrar</PrimaryButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.mascotas-page { display: flex; flex-direction: column; gap: 1.25rem; }

.page-header h2 { margin: 0 0 0.25rem 0; }

.confirm-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.85rem 1.25rem;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  color: #991b1b;
}
.confirm-actions { display: flex; gap: 0.5rem; }

.top-actions { display: flex; justify-content: flex-end; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}
.field--full { grid-column: 1 / -1; }
.field-hint { font-size: 0.76rem; color: var(--color-text-soft); margin-top: 0.2rem; display: block; }
.file-input { font-size: 0.88rem; }

.avatar-cell { width: 44px; padding-right: 0; }
.mascota-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--color-card-border);
  display: block;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.state { padding: 2.5rem; text-align: center; color: var(--color-text-soft); }
.table-wrapper { overflow-x: auto; }

.actions-cell { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.link-btn {
  background: none;
  border: 1px solid var(--color-card-border);
  color: var(--color-text);
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
}
.link-btn:hover { background: var(--color-bg-soft); }
.link-btn.danger { border-color: var(--color-danger); color: var(--color-danger); }
.link-btn.danger:hover { background: #fee2e2; }
.link-btn.active { border-color: var(--color-primary); color: var(--color-primary-dark); background: var(--color-primary-soft); }

/* ── Photo modal ──────────────────────────────── */
.mascota-avatar--clickable { cursor: zoom-in; }
.mascota-avatar--clickable:hover { opacity: 0.85; }

.photo-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.photo-modal {
  position: relative;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 1rem;
  max-width: 480px;
  width: 90vw;
  text-align: center;
  box-shadow: var(--shadow-md);
}
.photo-modal__close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-text-soft);
}
.photo-modal__img {
  width: 100%;
  max-height: 380px;
  object-fit: contain;
  border-radius: var(--radius-md);
}
.photo-modal__nombre {
  margin: 0.5rem 0 0 0;
  font-weight: 700;
}

/* ── Vacunas panel ────────────────────────────── */
.vacunas-table-wrapper { overflow-x: auto; margin-bottom: 1rem; }
.vacunas-empty { padding: 1.25rem; text-align: center; color: var(--color-text-soft); }
.obs-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.vacuna-form { margin-top: 1rem; border-top: 1px solid var(--color-card-border); padding-top: 1rem; }
.vacuna-form__title { margin: 0 0 0.75rem 0; font-size: 0.95rem; }

.required { color: var(--color-danger); }
</style>
