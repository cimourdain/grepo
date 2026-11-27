<!--
  A generic icon-triggered popover: a toggle button plus a panel anchored
  below it. The panel closes on a click outside the popover or on Escape.
  Opening another popover counts as an outside click, so at most one is open
  at a time.

  Used by the Library page's Filter/Sort/View and preset header controls,
  but has no Library-specific knowledge itself. Exposes `close()` so a
  parent can dismiss the panel once its action is done (e.g. a preset
  was saved). `active` turns the icon red, for a panel whose settings are in
  effect.

  Usage:
    <PopoverMenu label="Filter">
      <template #icon><svg>…</svg></template>
      …panel content…
    </PopoverMenu>
-->
<template>
  <div ref="popoverRootElement" class="popover-menu">
    <button
      type="button"
      class="popover-menu-trigger"
      :class="{ 'popover-menu-trigger--open': isOpen, 'popover-menu-trigger--active': active }"
      :aria-label="label"
      :aria-description="active ? 'Active' : undefined"
      :title="active ? `${label} (active)` : label"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <slot name="icon" />
    </button>
    <div v-if="isOpen" class="popover-menu-panel" role="dialog" :aria-label="label">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{
  /** Accessible name of the trigger button and panel (e.g. "Filter"). */
  label: string
  /** Whether what the panel sets is in effect: the icon turns red. */
  active?: boolean
}>()

/** Whether the panel is currently shown. */
const isOpen = ref(false)

/** Root element, used to tell inside clicks from outside ones. */
const popoverRootElement = ref<HTMLElement | null>(null)

/**
 * Close the panel when a click lands outside this popover.
 *
 * @param event - Any click event bubbling up to the document.
 */
function closeOnOutsideClick(event: MouseEvent): void {
  if (!isOpen.value) return
  const clickTarget = event.target as Node | null
  if (clickTarget && popoverRootElement.value?.contains(clickTarget)) return
  isOpen.value = false
}

/**
 * Close the panel when Escape is pressed.
 *
 * @param event - Any keydown event bubbling up to the document.
 */
function closeOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') isOpen.value = false
}

/** Close the panel (exposed to the parent component). */
function close(): void {
  isOpen.value = false
}

defineExpose({ close })

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick)
  document.addEventListener('keydown', closeOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnOutsideClick)
  document.removeEventListener('keydown', closeOnEscape)
})
</script>

<style scoped>
.popover-menu {
  position: relative;
}

.popover-menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.popover-menu-trigger:hover,
.popover-menu-trigger--open {
  background: var(--color-neutral-surface);
  color: var(--color-text);
}

.popover-menu-trigger--active,
.popover-menu-trigger--active:hover {
  color: var(--color-danger);
}

.popover-menu-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 10;
  min-width: 220px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: 0 8px 24px var(--color-shadow);
}
</style>
