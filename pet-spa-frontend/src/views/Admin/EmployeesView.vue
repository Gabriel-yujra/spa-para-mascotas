<script setup>
import { ref, computed, onMounted } from 'vue';
import { employeeApi } from '@/api/employeeApi';
import { isValidEmail, isNonEmpty } from '@/utils/validators';
import { ROLES, ASSIGNABLE_BY_ADMIN, roleLabel } from '@/utils/roles';

import AppCard from '@/components/AppCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const employees = ref([]);
const roles = ref([]);
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Formulario de creación: NO se pide password (la inicial = CI)
const newEmp = ref({
  full_name: '',
  email: '',
  ci: '',
  role_id: '',
  turno: 'mañana',
  telefono: '',
  especialidad: '',
  sueldo_mensual: 0,
  capacidad_simultanea: 1,
});
const creating = ref(false);

/**
 * Lista de roles que el ADMIN puede asignar (NO incluye 'jefe' ni 'cliente').
 * Se ordena igual que ASSIGNABLE_BY_ADMIN para que recepcion/groomer aparezcan
 * después de los roles "core" — mejor UX.
 */
const assignableRoles = computed(() => {
  return ASSIGNABLE_BY_ADMIN
    .map((roleName) => roles.value.find((r) => r.name === roleName))
    .filter(Boolean);
});

async function loadAll() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const [empResp, rolesResp] = await Promise.all([
      employeeApi.list(),
      employeeApi.listRoles(),
    ]);
    employees.value = empResp.employees || [];
    roles.value = rolesResp.roles || [];

    // Pre-seleccionar 'trabajador' por compatibilidad con tu flujo previo.
    // Si querés cambiar el default a 'recepcion' o 'groomer', cambiá esta línea.
    const defaultRole = roles.value.find((r) => r.name === ROLES.EMPLEADO);
    if (defaultRole && !newEmp.value.role_id) {
      newEmp.value.role_id = defaultRole.id_rol;
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar datos';
  } finally {
    loading.value = false;
  }
}

async function onCreate() {
  errorMsg.value = '';
  successMsg.value = '';

  if (!isNonEmpty(newEmp.value.full_name)) return (errorMsg.value = 'Nombre requerido');
  if (!isValidEmail(newEmp.value.email))   return (errorMsg.value = 'Email inválido');
  if (!isNonEmpty(newEmp.value.ci) || newEmp.value.ci.trim().length < 6) {
    return (errorMsg.value = 'CI requerido (mín. 6 caracteres). Será la contraseña inicial del empleado.');
  }
  if (!isNonEmpty(newEmp.value.role_id))   return (errorMsg.value = 'Selecciona un rol');

  creating.value = true;
  try {
    await employeeApi.create({
      ...newEmp.value,
      sueldo_mensual: Number(newEmp.value.sueldo_mensual) || 0,
      capacidad_simultanea: Number(newEmp.value.capacidad_simultanea) || 1,
    });
    successMsg.value = '✅ Empleado creado. Recibirá un correo de bienvenida.';
    newEmp.value = {
      full_name: '',
      email: '',
      ci: '',
      role_id: newEmp.value.role_id,
      turno: 'mañana',
      telefono: '',
      especialidad: '',
      sueldo_mensual: 0,
      capacidad_simultanea: 1,
    };
    await loadAll();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || err.response?.data?.message || 'Error al crear';
  } finally {
    creating.value = false;
  }
}

async function toggleActivo(emp) {
  try {
    await employeeApi.update(emp.id_trabajador, { activo: !emp.activo });
    await loadAll();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al actualizar';
  }
}

async function setEstado(emp, estado) {
  try {
    await employeeApi.changeUserEstado(emp.id_usuario, estado);
    await loadAll();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cambiar estado';
  }
}

function estadoBadgeClass(estado) {
  switch (estado) {
    case 'activo':     return 'badge-success';
    case 'pendiente':  return 'badge-warning';
    case 'inactivo':   return 'badge-muted';
    case 'bloqueado':  return 'badge-danger';
    default:           return '';
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="employees-page">
    <header class="header">
      <h2>👥 Gestión de empleados</h2>
      <p class="muted">Crea, lista y modifica empleados del Pet Spa</p>
    </header>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="success">{{ successMsg }}</p>

    <!-- ============ Crear ============ -->
    <AppCard title="Crear empleado" subtitle="La contraseña inicial será su CI">
      <form @submit.prevent="onCreate">
        <div class="grid">
          <div class="field">
            <label>Nombre completo</label>
            <input v-model="newEmp.full_name" required />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="newEmp.email" type="email" required />
          </div>

          <div class="field">
            <label>CI (será la contraseña inicial)</label>
            <input v-model="newEmp.ci" required />
          </div>

          <!-- Selector de rol con etiquetas amigables -->
          <div class="field">
            <label>Rol</label>
            <select v-model="newEmp.role_id" required>
              <option value="" disabled>Selecciona...</option>
              <option
                v-for="r in assignableRoles"
                :key="r.id_rol"
                :value="r.id_rol"
              >
                {{ roleLabel(r.name) }}
              </option>
            </select>
            <small class="muted">
              Roles disponibles: Administrador, Trabajador, Recepción, Groomer.
              <br>(El rol "Jefe" sólo puede ser asignado por otro Jefe.)
            </small>
          </div>

          <div class="field">
            <label>Turno</label>
            <select v-model="newEmp.turno">
              <option value="mañana">Mañana (09:00–13:00)</option>
              <option value="tarde">Tarde (14:00–18:00)</option>
            </select>
          </div>
          <div class="field">
            <label>Teléfono</label>
            <input v-model="newEmp.telefono" />
          </div>

          <div class="field">
            <label>Especialidad</label>
            <input v-model="newEmp.especialidad" placeholder="Corte fino, baño, etc." />
          </div>
          <div class="field">
            <label>Sueldo mensual (Bs)</label>
            <input v-model="newEmp.sueldo_mensual" type="number" min="0" step="0.01" />
          </div>

          <div class="field">
            <label>Capacidad simultánea</label>
            <input v-model="newEmp.capacidad_simultanea" type="number" min="1" />
          </div>
        </div>

        <p class="info-pill">
          ℹ️ Se enviará un correo de bienvenida. El empleado tendrá un plazo
          configurable para iniciar sesión y cambiar su contraseña.
        </p>

        <PrimaryButton type="submit" :loading="creating" size="lg">
          {{ creating ? 'Creando...' : 'Crear empleado' }}
        </PrimaryButton>
      </form>
    </AppCard>

    <!-- ============ Lista ============ -->
    <AppCard :title="`Empleados (${employees.length})`" no-padding>
      <div v-if="loading" class="state">Cargando…</div>
      <div v-else-if="!employees.length" class="state">Sin empleados</div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Turno</th>
              <th>Especialidad</th>
              <th>Estado</th>
              <th>Activo</th>
              <th>Cambio password</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in employees" :key="emp.id_trabajador">
              <td>{{ emp.nombre }}</td>
              <td>{{ emp.email }}</td>
              <td>
                <!-- Etiqueta amigable + clase basada en el slug del rol -->
                <span class="badge" :class="`role-${emp.rol_name}`">
                  {{ roleLabel(emp.rol_name) }}
                </span>
              </td>
              <td>{{ emp.turno || '-' }}</td>
              <td>{{ emp.especialidad || '-' }}</td>
              <td>
                <span class="badge" :class="estadoBadgeClass(emp.estado)">{{ emp.estado }}</span>
              </td>
              <td>{{ emp.activo ? 'Sí' : 'No' }}</td>
              <td>
                <span v-if="emp.debe_cambiar_password" class="badge badge-warning">Pendiente</span>
                <span v-else class="badge badge-success">OK</span>
              </td>
              <td class="actions-cell">
                <button class="link-btn" @click="toggleActivo(emp)">
                  {{ emp.activo ? 'Desactivar' : 'Activar' }} (turno)
                </button>
                <button
                  v-if="emp.estado !== 'inactivo'"
                  class="link-btn danger"
                  @click="setEstado(emp, 'inactivo')"
                >
                  Inactivar usuario
                </button>
                <button
                  v-else
                  class="link-btn"
                  @click="setEstado(emp, 'activo')"
                >
                  Reactivar usuario
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
.employees-page { display: flex; flex-direction: column; gap: 1.25rem; }
.header h2 { margin: 0 0 0.25rem 0; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.info-pill {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  margin: 0.75rem 0 1rem 0;
}

.state { padding: 2rem; text-align: center; color: var(--color-text-soft); }
.table-wrapper { overflow-x: auto; }

.actions-cell {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
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

/* Badges por rol — añadidos los nuevos colores para recepcion y groomer */
.role-admin       { background: #fee2e2; color: #991b1b; }
.role-jefe        { background: #fef3c7; color: #92400e; }
.role-trabajador  { background: #d1fae5; color: #065f46; }
.role-cliente     { background: var(--color-primary-soft); color: var(--color-primary-dark); }
.role-recepcion   { background: #ede9fe; color: #5b21b6; } /* lavanda */
.role-groomer     { background: #ffe4e6; color: #9d174d; } /* rosa */
</style>
