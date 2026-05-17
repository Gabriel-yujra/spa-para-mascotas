<script setup>
defineProps({
  variant:  { type: String,  default: 'primary' }, // primary | accent | ghost | danger
  size:     { type: String,  default: 'md' },      // sm | md | lg
  block:    { type: Boolean, default: false },
  loading:  { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type:     { type: String,  default: 'button' },
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="btn"
    :class="[`v-${variant}`, `s-${size}`, { block, loading }]"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <span class="btn__label">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.btn {
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: transform 0.06s, box-shadow 0.15s, background 0.15s, color 0.15s;
  box-shadow: var(--shadow-sm);
}
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn:disabled              { opacity: 0.55; cursor: not-allowed; }
.btn.block                 { width: 100%; }

/* sizes */
.s-sm { padding: 0.4rem 0.9rem;  font-size: 0.85rem; }
.s-md { padding: 0.65rem 1.4rem; font-size: 0.95rem; }
.s-lg { padding: 0.85rem 1.8rem; font-size: 1.05rem; }

/* variants */
.v-primary {
  background: var(--color-primary);
  color: #fff;
}
.v-primary:hover:not(:disabled) { background: var(--color-primary-dark); }

.v-accent {
  background: var(--color-accent);
  color: #fff;
}
.v-accent:hover:not(:disabled) { background: var(--color-accent-dark); }

.v-ghost {
  background: transparent;
  color: var(--color-primary-dark);
  border: 2px solid var(--color-primary);
  box-shadow: none;
}
.v-ghost:hover:not(:disabled) { background: var(--color-primary-soft); }

.v-danger {
  background: var(--color-danger);
  color: #fff;
}
.v-danger:hover:not(:disabled) { background: #b91c1c; }

/* spinner */
.spinner {
  width: 14px; height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
