<script setup>
defineProps({
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
  variant:  { type: String, default: 'default' }, // default | soft | accent
  noPadding:{ type: Boolean, default: false },
});
</script>

<template>
  <section
    class="app-card pop-in"
    :class="[`variant-${variant}`, { 'no-padding': noPadding }]"
  >
    <header v-if="title || subtitle || $slots.header" class="app-card__header">
      <slot name="header">
        <h2 v-if="title" class="app-card__title">{{ title }}</h2>
        <p  v-if="subtitle" class="app-card__subtitle">{{ subtitle }}</p>
      </slot>
    </header>

    <div class="app-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="app-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.app-card {
  background: var(--color-card);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 1.5rem 1.75rem;
}
.app-card.no-padding { padding: 0; }

.variant-soft   { background: var(--color-bg-soft); }
.variant-accent { border-color: var(--color-accent); border-width: 2px; }

.app-card__header { margin-bottom: 1rem; }
.app-card__title  {
  margin: 0 0 0.25rem 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-text);
}
.app-card__subtitle { margin: 0; color: var(--color-text-soft); font-size: 0.95rem; }

.app-card__footer {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--color-card-border);
}
</style>
