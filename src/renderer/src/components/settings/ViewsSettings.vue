<!--
  The "Repositories view styling configuration" section of Settings → View: the view configurations of the Repos page, each a
  name, a font size (px) and a grid item minimum width (px). One is the default, the one the
  Repos page opens with (radio button); it can't be deleted while it is the default, and at least
  one view always exists. Before the user defines any, the only view is the default one, made
  from the page's original style. The Repos page's View menu switches between them.

  There is no Save button: the views are saved by themselves once valid (every view named, the
  names different, one default). The Repos page reads them again when its window regains focus.
-->
<template>
  <section class="settings-tab" aria-label="Repositories view styling configuration">
    <h3>Repositories view styling configuration</h3>
    <p class="settings-hint">
      A view sets the style of the repositories in the Repos page. The default view is the one the
      page opens with; the page's View menu switches to another.
    </p>
    <ul class="view-list">
      <li v-for="(view, index) in views" :key="view.id" class="view-row">
        <label class="view-default" title="Default view">
          <input
            v-model="defaultId"
            type="radio"
            name="default-view"
            :value="view.id"
            :aria-label="`${view.name || 'View ' + (index + 1)} is the default view`"
          />
          Default
        </label>
        <label class="view-field">
          <span>Name</span>
          <input
            v-model="view.name"
            type="text"
            :maxlength="VIEW_NAME_MAX_LENGTH"
            :aria-label="`View ${index + 1} name`"
          />
        </label>
        <label class="view-field">
          <span>Font size (px)</span>
          <input
            v-model.number="view.fontSize"
            type="number"
            :min="FONT_SIZE_RANGE.min"
            :max="FONT_SIZE_RANGE.max"
            :aria-label="`View ${index + 1} font size`"
          />
        </label>
        <label class="view-field">
          <span>Item min width (px)</span>
          <input
            v-model.number="view.minItemWidth"
            type="number"
            step="10"
            :min="MIN_ITEM_WIDTH_RANGE.min"
            :max="MIN_ITEM_WIDTH_RANGE.max"
            :aria-label="`View ${index + 1} item minimum width`"
          />
        </label>
        <button
          type="button"
          :disabled="view.id === defaultId"
          :title="view.id === defaultId ? 'The default view can’t be deleted' : 'Delete the view'"
          :aria-label="`Delete view ${index + 1}`"
          @click="views.splice(index, 1)"
        >
          Delete
        </button>
      </li>
    </ul>
    <div class="view-actions">
      <button type="button" class="settings-button" @click="addView">Add a view</button>
    </div>
    <AutoSaveStatus :status="autoSave.status.value" :message="autoSave.message.value" />
    <p v-if="loadError" class="settings-message settings-message--error" role="alert">
      {{ loadError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { useAutoSave } from '../../settings/use-auto-save'
import AutoSaveStatus from './AutoSaveStatus.vue'
import type { IpcApi } from '../../../../shared/ipc-contract'
import {
  DEFAULT_VIEW,
  FONT_SIZE_RANGE,
  MIN_ITEM_WIDTH_RANGE,
  validateRepoViews,
  VIEW_NAME_MAX_LENGTH,
  type RepoViews,
  type ViewConfig
} from '../../../../shared/repo-views'

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

const views = ref<ViewConfig[]>([{ ...DEFAULT_VIEW }])
const defaultId = ref(DEFAULT_VIEW.id)
const loadError = ref('')

/** The views as the page edits them, in the shape the main process saves. */
function currentViews(): RepoViews {
  return { views: views.value.map((view) => ({ ...view })), defaultId: defaultId.value }
}

const autoSave = useAutoSave({
  source: currentViews,
  validate: validateRepoViews,
  save: async (config) => api?.saveRepoViews(config) ?? { success: true }
})

onMounted(async () => {
  if (!api) return
  try {
    const config = await api.getRepoViews()
    views.value = config.views
    defaultId.value = config.defaultId
  } catch {
    loadError.value = 'The views couldn’t be read.'
  }
  autoSave.markSaved()
})

/** Adds a view, starting from the default view's style. */
function addView(): void {
  const base = views.value.find((view) => view.id === defaultId.value) ?? DEFAULT_VIEW
  views.value.push({
    id: crypto.randomUUID(),
    name: `View ${views.value.length + 1}`,
    fontSize: base.fontSize,
    minItemWidth: base.minItemWidth
  })
}
</script>

<style src="./settings-form.css"></style>
<style scoped>
.view-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.view-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.view-default {
  display: flex;
  align-items: center;
  gap: 4px;
  align-self: center;
}

.view-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85em;
  color: var(--color-text-muted);
}

.view-field input {
  width: 9em;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-background);
  color: var(--color-text);
}

.view-row button {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
}

.view-row button:disabled {
  opacity: 0.5;
  cursor: default;
}

.view-actions {
  display: flex;
  gap: 8px;
}
</style>
