<!--
  A collapsible group of the Library page's Filter popover: a heading button
  showing or hiding its items. It starts open only when one of its items is set,
  and its heading takes the accent color as long as one is, even once closed.

  The popover's panel is built each time it opens, so a group decides again each
  time: while the popover stays open, it only changes on a click, and one whose
  last item was just unset doesn't close under the pointer.

  Usage:
    <FilterGroup label="Tags" :active="hasTagSelected">…items…</FilterGroup>
-->
<template>
  <section class="filter-group">
    <button
      type="button"
      class="filter-group-toggle"
      :class="{ 'filter-group-toggle--active': active }"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <svg
        class="filter-group-chevron"
        :class="{ 'filter-group-chevron--open': isOpen }"
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
      <span class="filter-group-label">{{ label }}</span>
    </button>
    <div v-if="isOpen" class="filter-group-items">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  /** The group's heading. */
  label: string
  /** Whether one of its items is set. */
  active: boolean
}>()

/** Whether its items are shown: starts from `active`, as a click decides from then on. */
const isOpen = ref(props.active)
</script>

<style scoped>
.filter-group {
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.filter-group-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 12px;
  text-align: left;
  text-transform: uppercase;
  cursor: pointer;
}

.filter-group-toggle:hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.filter-group-toggle--active,
.filter-group-toggle--active:hover {
  color: var(--color-accent);
}

.filter-group-chevron {
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.filter-group-chevron--open {
  transform: rotate(90deg);
}

.filter-group-items {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 2px 12px 8px;
}
</style>
