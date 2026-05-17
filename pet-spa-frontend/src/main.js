// src/main.js
// REEMPLAZO. Único cambio: importa los estilos globales nuevos.
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './store/authStore';

import './styles/global.css'; // 🎨 paleta + tokens cartoon

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const authStore = useAuthStore();
authStore.initFromStorage();

app.use(router);
app.mount('#app');
