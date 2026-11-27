<!--
  Tabs of a page: a tab bar, then one panel per tab, filled through a slot
  named after the tab's key; the first tab starts selected. Hidden panels stay
  mounted, so what they hold survives switching tabs (a form's input, a
  background task followed live). The bar follows the WAI-ARIA tabs pattern:
  only the selected tab is in the Tab order, the Left/Right arrows, Home and
  End move between tabs. The bar takes the page's whole width; the panels keep
  a readable form width. A tab may show a count in a tag after its label, and
  `select` lets the parent show a tab, and the `selected` event tells it a tab was shown.

  Usage:
    <PageTabs :tabs="[{ key: 'metadata', label: 'Metadata' }, { key: 'tasks', label: 'Background tasks' }]">
      <template #metadata>…</template>
      <template #tasks>…</template>
    </PageTabs>
-->
<template>
  <div class="page-tabs">
    <div class="page-tab-bar" role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :id="tabIdOf(tab.key)"
        :key="tab.key"
        :ref="(element) => rememberTabButton(index, element as HTMLButtonElement | null)"
        type="button"
        role="tab"
        class="page-tab"
        :class="{ 'page-tab--selected': tab.key === selectedTabKey }"
        :aria-selected="tab.key === selectedTabKey"
        :aria-controls="panelIdOf(tab.key)"
        :tabindex="tab.key === selectedTabKey ? 0 : -1"
        @click="selectTab(tab.key)"
        @keydown="moveWithKeyboard($event, index)"
      >
        {{ tab.label }}
        <span v-if="tab.count" class="page-tab-count">{{ tab.count }}</span>
      </button>
    </div>
    <div
      v-for="tab in tabs"
      v-show="tab.key === selectedTabKey"
      :id="panelIdOf(tab.key)"
      :key="tab.key"
      class="page-tab-panel"
      role="tabpanel"
      :aria-labelledby="tabIdOf(tab.key)"
      tabindex="0"
    >
      <slot :name="tab.key" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue'

/** One tab. */
export interface PageTab {
  /** Its identifier, also the name of the slot filling its panel. */
  key: string
  label: string
  /** A number shown in a tag after the label; nothing when absent or 0. */
  count?: number
}

const props = defineProps<{
  /** The tabs, in display order: at least one. */
  tabs: readonly PageTab[]
}>()

const emit = defineEmits<{
  /** A tab became the selected one (by a click, the keyboard or `select`). */
  selected: [tabKey: string]
}>()

/** The prefix of this instance's element ids. */
const idPrefix = useId()

/** The selected tab. */
const selectedTabKey = ref(props.tabs[0]!.key)

/**
 * Selects a tab (exposed to the parent, e.g. to show something it holds).
 *
 * @param tabKey - the tab.
 */
function select(tabKey: string): void {
  selectTab(tabKey)
}

/**
 * Makes a tab the selected one and tells the parent when it wasn't already.
 *
 * @param tabKey - the tab.
 */
function selectTab(tabKey: string): void {
  if (selectedTabKey.value === tabKey) return
  selectedTabKey.value = tabKey
  emit('selected', tabKey)
}

defineExpose({ select })

/** The tab buttons, by position, to move the focus. */
const tabButtons: Array<HTMLButtonElement | null> = []

/**
 * Remembers a tab's button.
 *
 * @param index - the tab's position.
 * @param element - its button, `null` once removed.
 */
function rememberTabButton(index: number, element: HTMLButtonElement | null): void {
  tabButtons[index] = element
}

/**
 * Returns a tab button's id.
 *
 * @param tabKey - the tab.
 */
function tabIdOf(tabKey: string): string {
  return `${idPrefix}-tab-${tabKey}`
}

/**
 * Returns a tab panel's id.
 *
 * @param tabKey - the tab.
 */
function panelIdOf(tabKey: string): string {
  return `${idPrefix}-panel-${tabKey}`
}

/**
 * Selects and focuses another tab from the keyboard.
 *
 * @param event - the key pressed on a tab.
 * @param index - that tab's position.
 */
function moveWithKeyboard(event: KeyboardEvent, index: number): void {
  const targetIndexes: Record<string, number> = {
    ArrowLeft: (index - 1 + props.tabs.length) % props.tabs.length,
    ArrowRight: (index + 1) % props.tabs.length,
    Home: 0,
    End: props.tabs.length - 1
  }
  const targetIndex = targetIndexes[event.key]
  if (targetIndex === undefined) return
  event.preventDefault()
  selectTab(props.tabs[targetIndex]!.key)
  tabButtons[targetIndex]?.focus()
}
</script>

<style scoped>
.page-tabs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border);
}

.page-tab {
  margin-bottom: -1px;
  padding: 8px 14px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.page-tab-count {
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--color-neutral-surface);
  font-size: 11px;
  color: var(--color-text);
}

.page-tab:hover {
  color: var(--color-text);
}

.page-tab--selected {
  border-bottom-color: var(--color-accent);
  color: var(--color-text);
}

.page-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
