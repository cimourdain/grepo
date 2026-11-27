<!--
  The View tab of Settings: the Repos presets in the order of the sidebar, each with a toggle
  showing it in the sidebar or not, buttons moving it up or down, an optional sidebar name (empty:
  the preset's own name), its search text, and a delete button (asking for confirmation inline).
  Each change is saved at once through the main process and the shared list is read again, so the
  sidebar follows. A refused change is said under the list.
-->
<template>
  <section class="settings-tab">
    <h3>Presets</h3>
    <p class="settings-hint">
      Choose which Repos presets the sidebar lists, in which order and under which name. A preset
      the sidebar hides stays usable from Repos. Save one from the
      <RouterLink to="/repos">Repos</RouterLink> page.
    </p>
    <p v-if="presets.length === 0" class="settings-hint">There are no presets yet.</p>
    <ul v-else class="preset-list" aria-label="Repos presets">
      <li
        v-for="(preset, index) in presets"
        :key="preset.name"
        class="preset"
        :class="{ 'preset--hidden': !preset.sidebarEnabled }"
      >
        <div class="preset-heading">
          <span class="preset-name">{{ preset.name }}</span>
          <code class="preset-search">{{ preset.search || '(empty search)' }}</code>
        </div>
        <div class="preset-controls">
          <label class="preset-toggle">
            <input
              type="checkbox"
              :checked="preset.sidebarEnabled"
              :aria-label="`Show ${preset.name} in the sidebar`"
              @change="toggle(preset.name, ($event.target as HTMLInputElement).checked)"
            />
            Show in the sidebar
          </label>
          <label class="preset-rename">
            <span>Sidebar name</span>
            <input
              v-model="drafts[preset.name]"
              type="text"
              :maxlength="PRESET_SIDEBAR_NAME_MAX_LENGTH"
              :placeholder="preset.name"
              :aria-label="`Sidebar name of ${preset.name}`"
              @change="rename(preset.name)"
            />
          </label>
          <button
            type="button"
            :disabled="index === 0"
            :aria-label="`Move ${preset.name} up`"
            @click="move(preset.name, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            :disabled="index === presets.length - 1"
            :aria-label="`Move ${preset.name} down`"
            @click="move(preset.name, 1)"
          >
            ↓
          </button>
          <template v-if="toDelete === preset.name">
            <span>Delete?</span>
            <button type="button" @click="remove(preset.name)">Delete</button>
            <button type="button" @click="toDelete = null">Cancel</button>
          </template>
          <button
            v-else
            type="button"
            :aria-label="`Delete ${preset.name}`"
            @click="toDelete = preset.name"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>
    <p v-if="errorMessage" class="settings-message settings-message--error" role="alert">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'

import type { IpcApi, Outcome } from '../../../../shared/ipc-contract'
import { PRESET_SIDEBAR_NAME_MAX_LENGTH } from '../../../../shared/repository-presets'
import { loadPresets, presets } from '../../presets/preset-client'

/** The sidebar name being typed for each preset, by preset name. */
const drafts = reactive<Record<string, string>>({})
const errorMessage = ref('')
/** The preset whose deletion waits for a confirmation. */
const toDelete = ref<string | null>(null)

onMounted(loadPresets)

// Each draft starts at the saved sidebar name, whenever the presets are read.
watch(
  presets,
  (list) => {
    for (const key of Object.keys(drafts)) delete drafts[key]
    for (const preset of list) drafts[preset.name] = preset.sidebarName
  },
  { immediate: true }
)

/**
 * Runs a change, then reads the presets again so the sidebar follows.
 *
 * @param change - the main-process call.
 */
async function applyChange(change: (api: IpcApi) => Promise<Outcome>): Promise<void> {
  errorMessage.value = ''
  const api = (window as { api?: IpcApi }).api
  try {
    if (!api) throw new Error('unavailable')
    const result = await change(api)
    if (!result.success) errorMessage.value = result.message
  } catch {
    errorMessage.value = 'The change couldn’t be saved.'
  }
  await loadPresets()
}

/**
 * Shows or hides a preset in the sidebar.
 *
 * @param name - the preset.
 * @param enabled - whether the sidebar lists it.
 */
function toggle(name: string, enabled: boolean): Promise<void> {
  return applyChange((api) => api.configurePreset(name, { sidebarEnabled: enabled }))
}

/**
 * Saves the sidebar name typed for a preset.
 *
 * @param name - the preset.
 */
function rename(name: string): Promise<void> {
  return applyChange((api) => api.configurePreset(name, { sidebarName: drafts[name] ?? '' }))
}

/**
 * Moves a preset up or down.
 *
 * @param name - the preset.
 * @param offset - -1 for up, 1 for down.
 */
function move(name: string, offset: -1 | 1): Promise<void> {
  return applyChange((api) => api.movePreset(name, offset))
}

/**
 * Deletes a preset.
 *
 * @param name - the preset.
 */
async function remove(name: string): Promise<void> {
  toDelete.value = null
  await applyChange((api) => api.deletePreset(name))
}
</script>

<style src="./settings-form.css"></style>
<style scoped>
.preset-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.preset {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.preset--hidden {
  opacity: 0.75;
}

.preset-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.preset-name {
  font-weight: 600;
}

.preset-search {
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.preset-toggle,
.preset-rename {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preset-rename input {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-background);
  color: var(--color-text);
}

.preset-controls button {
  padding: 3px 10px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
}

.preset-controls button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
