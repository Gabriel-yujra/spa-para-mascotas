// src/store/authStore.js
// PARCHE — Bug 1:
//   El user del store NO incluía two_factor_enabled, así que al recargar/
//   navegar y volver, AdminSecurityView leía undefined y mostraba "desactivado"
//   por un momento. Ahora:
//     - completeLoginFromPayload guarda two_factor_enabled en user (boolean).
//     - refreshMe() también lo guarda y normaliza.
//     - setTwoFactorEnabled(value) permite a las vistas actualizar el flag
//       sin tener que hacer fetch /me después de enable/disable.
//
// El resto del store no cambia.
import { defineStore } from 'pinia';
import { authApi } from '@/api/authApi';

const TOKEN_KEY = 'petspa_token';
const USER_KEY  = 'petspa_user';
const ROLE_KEY  = 'petspa_role';

function asBool(v) {
  // Normaliza string/number/null/undefined a booleano real.
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  return false;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,                  // { id_usuario, nombre, email, rol, two_factor_enabled }
    role: null,
    mustChangePassword: false,
    pendingTwoFAToken: null,
  }),

  getters: {
    isAuthenticated: (s) => !!s.token,
    isPending2FA:    (s) => !!s.pendingTwoFAToken,
    twoFactorEnabled:(s) => asBool(s.user?.two_factor_enabled),
  },

  actions: {
    initFromStorage() {
      const token = localStorage.getItem(TOKEN_KEY);
      const role = localStorage.getItem(ROLE_KEY);
      const userRaw = localStorage.getItem(USER_KEY);
      if (token) this.token = token;
      if (role) this.role = role;
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          // Normaliza el flag al cargar de localStorage
          if (u && 'two_factor_enabled' in u) {
            u.two_factor_enabled = asBool(u.two_factor_enabled);
          }
          this.user = u;
        } catch {
          this.user = null;
        }
      }
    },

    completeLoginFromPayload(data) {
      this.token = data.token;
      this.mustChangePassword = !!data.mustChangePassword;
      this.pendingTwoFAToken = null;

      if (data.user) {
        // FIX bug 1: persistir SIEMPRE two_factor_enabled como booleano.
        this.user = {
          ...data.user,
          two_factor_enabled: asBool(data.user.two_factor_enabled),
        };
        this.role = data.user.rol || data.user.rol_name || null;
      }

      localStorage.setItem(TOKEN_KEY, this.token);
      if (this.role) localStorage.setItem(ROLE_KEY, this.role);
      if (this.user) localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    },

    async login(email, password) {
      const data = await authApi.login({ email, password });

      if (data.requires2FA) {
        this.pendingTwoFAToken = data.twoFAToken;
        this.token = null;
        this.user = null;
        this.role = null;
        return { kind: 'requires2FA' };
      }

      if (!data.user && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        this.token = data.token;
        try {
          const me = await authApi.me();
          data.user = me.user
            ? {
                id_usuario: me.user.id_usuario,
                nombre: me.user.nombre,
                email: me.user.email,
                rol: me.user.rol_name || me.user.rol,
                two_factor_enabled: asBool(me.user.two_factor_enabled),
              }
            : null;
        } catch {
          data.user = null;
        }
      }

      this.completeLoginFromPayload(data);
      return { kind: 'logged', mustChangePassword: this.mustChangePassword };
    },

    async verify2FA(code) {
      if (!this.pendingTwoFAToken) {
        throw new Error('No hay un proceso 2FA pendiente');
      }
      const data = await authApi.verify2FA(this.pendingTwoFAToken, code);
      this.completeLoginFromPayload(data);
      return data;
    },

    cancelPending2FA() {
      this.pendingTwoFAToken = null;
    },

    async registerClient(payload) {
      return await authApi.registerClient(payload);
    },

    async activateAccount(token) {
      const data = await authApi.activateAccount(token);
      this.completeLoginFromPayload(data);
      return data;
    },

    async changePassword(oldPassword, newPassword) {
      const data = await authApi.changePassword({ oldPassword, newPassword });
      this.mustChangePassword = false;
      return data;
    },

    /**
     * Refresca el user desde /auth/me y persiste two_factor_enabled como bool.
     */
    async refreshMe() {
      try {
        const me = await authApi.me();
        if (me.user) {
          this.user = {
            id_usuario: me.user.id_usuario,
            nombre: me.user.nombre,
            email: me.user.email,
            rol: me.user.rol_name || me.user.rol,
            two_factor_enabled: asBool(me.user.two_factor_enabled),
          };
          if (me.user.rol_name) {
            this.role = me.user.rol_name;
            localStorage.setItem(ROLE_KEY, this.role);
          }
          localStorage.setItem(USER_KEY, JSON.stringify(this.user));
        }
      } catch {
        /* noop */
      }
    },

    /**
     * NUEVO. Permite actualizar el flag 2FA en el store con la respuesta
     * directa de /2fa/enable o /2fa/disable, sin tener que hacer otra
     * llamada a /me. La vista AdminSecurityView lo usa.
     */
    setTwoFactorEnabled(value) {
      const v = asBool(value);
      if (this.user) {
        this.user = { ...this.user, two_factor_enabled: v };
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      this.role = null;
      this.mustChangePassword = false;
      this.pendingTwoFAToken = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ROLE_KEY);
    },
  },
});
