<script setup>
defineProps({
  illustration: { type: String, default: '' }, // URL importada
  illustrationAlt: { type: String, default: '' },
});
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__panel">
      <slot />
    </div>

    <aside v-if="illustration" class="auth-layout__art" aria-hidden="true">
      <img :src="illustration" :alt="illustrationAlt" />
      <slot name="art-extra" />
    </aside>
  </div>
</template>

<style scoped>
.auth-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: center;
  max-width: 980px;
  margin: 0 auto;
}
.auth-layout__panel { min-width: 0; }

.auth-layout__art {
  display: none;
}
.auth-layout__art img {
  width: 100%;
  max-width: 420px;
  display: block;
  margin: 0 auto;
}

@media (min-width: 880px) {
  .auth-layout {
    grid-template-columns: minmax(360px, 480px) 1fr;
  }
  .auth-layout__art {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
}
</style>
