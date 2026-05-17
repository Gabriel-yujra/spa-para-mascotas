// src/api/http.js
// Axios pre-configurado con baseURL e interceptors (token + 401).
import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
});

// --- Request: inyecta el token desde localStorage ---
// (Leemos de localStorage, no del store, para evitar dependencia circular
//  authStore -> http -> authStore al cargarse.)
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('petspa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response: si 401, hacer logout y redirigir ---
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Import dinámico para evitar dependencia circular
      const { useAuthStore } = await import('@/store/authStore');
      const auth = useAuthStore();
      auth.logout();
      // Redirigir a /login si no estamos ya ahí
      if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default http;
