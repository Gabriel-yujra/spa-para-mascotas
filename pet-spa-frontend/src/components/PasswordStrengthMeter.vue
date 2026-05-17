<script setup>
import { computed } from 'vue';
import { isStrongPassword } from '@/utils/validators';

const props = defineProps({
  password: { type: String, default: '' },
  showHints: { type: Boolean, default: true },
});

const result = computed(() => isStrongPassword(props.password));

// 5 bloques. El nº de bloques activos = score (0..5).
const blocks = computed(() => {
  const s = result.value.score;
  return [0, 1, 2, 3, 4].map((i) => ({
    active: i < s,
  }));
});

const labelMap = {
  0: 'Muy débil',
  1: 'Muy débil',
  2: 'Débil',
  3: 'Aceptable',
  4: 'Fuerte',
  5: 'Muy fuerte',
};

const label = computed(() => labelMap[result.value.score] || 'Muy débil');

const color = computed(() => {
  const s = result.value.score;
  if (s >= 5) return 'var(--color-success)';
  if (s >= 4) return '#65b741';
  if (s >= 3) return 'var(--color-warning)';
  if (s >= 2) return '#f97316';
  return 'var(--color-danger)';
});

const flags = computed(() => result.value.flags || {});
</script>

<template>
  <div v-if="password" class="strength">
    <div class="bars" role="progressbar" :aria-valuenow="result.score" aria-valuemin="0" aria-valuemax="5">
      <span
        v-for="(b, idx) in blocks"
        :key="idx"
        class="bar"
        :style="{ background: b.active ? color : '#e5e7eb' }"
      />
    </div>
    <small class="label" :style="{ color }">
      Fuerza: {{ label }}
    </small>

    <ul v-if="showHints && !result.valid" class="hints">
      <li :class="{ ok: flags.hasMinLength }">≥ 8 caracteres</li>
      <li :class="{ ok: flags.hasUpper }">Letra mayúscula</li>
      <li :class="{ ok: flags.hasLower }">Letra minúscula</li>
      <li :class="{ ok: flags.hasNumber }">Número</li>
      <li :class="{ ok: flags.hasSymbol }">Símbolo</li>
    </ul>
  </div>
</template>

<style scoped>
.strength { margin-top: 0.4rem; }
.bars {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin-bottom: 0.25rem;
}
.bar {
  height: 6px;
  border-radius: 3px;
  transition: background 0.2s ease;
}
.label { font-weight: 700; font-size: 0.8rem; }

.hints {
  list-style: none;
  padding: 0;
  margin: 0.4rem 0 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.15rem 0.6rem;
  font-size: 0.78rem;
  color: var(--color-text-soft);
}
.hints li::before {
  content: '○';
  margin-right: 0.3rem;
  color: var(--color-text-soft);
}
.hints li.ok::before {
  content: '●';
  color: var(--color-success);
}
.hints li.ok { color: var(--color-success); }
</style>
