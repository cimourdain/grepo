<!--
  A labelled tri-state checkbox, used by every selectable-items facet of the
  Library page's Filter popover.

  Clicking cycles its `v-model` un-set (`undefined`, empty box) → `'only'`
  (green tick) → `'exclude'` (red cross) → un-set. It holds no filtering
  logic itself — see `filters/tri-state-facet.ts` for how a facet's
  states are applied.

  Usage: <TriStateCheckbox v-model="tagState" label="Action" />
-->
<template>
  <button
    type="button"
    class="tri-state-checkbox"
    :class="`tri-state-checkbox--${modelValue ?? 'unset'}`"
    :data-state="modelValue ?? 'unset'"
    :aria-label="`${label}: ${stateDescription}`"
    @click="modelValue = nextTriStateValue(modelValue)"
  >
    <span class="tri-state-checkbox-box" aria-hidden="true">{{ stateSymbol }}</span>
    <span class="tri-state-checkbox-label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { nextTriStateValue, type TriStateValue } from '../filters/tri-state-facet'

defineProps<{
  /** Visible text next to the box (e.g. a tag name). */
  label: string
}>()

const modelValue = defineModel<TriStateValue | undefined>()

/** Glyph drawn inside the box for the current state. */
const stateSymbol = computed<string>(() => {
  if (modelValue.value === 'only') return '✓'
  if (modelValue.value === 'exclude') return '✕'
  return ''
})

/** Accessible description of the current state. */
const stateDescription = computed<string>(() => {
  if (modelValue.value === 'only') return 'only'
  if (modelValue.value === 'exclude') return 'excluded'
  return 'not set'
})
</script>

<style scoped>
.tri-state-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: start;
  cursor: pointer;
}

.tri-state-checkbox-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-on-solid);
}

.tri-state-checkbox--only .tri-state-checkbox-box {
  background: var(--color-success-strong);
  border-color: var(--color-success-strong);
}

.tri-state-checkbox--exclude .tri-state-checkbox-box {
  background: var(--color-danger-strong);
  border-color: var(--color-danger-strong);
}
</style>
