<!--
  The Import/Export tab of Settings.

  - Export: asks where to save, then writes a JSON file holding the local repositories paths, the
    rules (naming rules, tags rules and tag colors) and the settings of the View tab (the view
    styling configurations and the presets). It holds no secret: the GitHub token isn't exported.
    The "Include the settings based on local paths" option (ticked by default) leaves out the local
    repositories paths and the tag rules tested on the local path.
  - Import: asks for such a file and checks it, saying what it holds; nothing changes until the
    user confirms, as an import replaces the current paths, rules, views and presets (a file made
    without the local-path settings keeps this computer's own). An invalid
    file is refused whole, with the reason. Emits `imported` once applied, so the other tabs read
    their settings again.
-->
<template>
  <section class="settings-tab">
    <section class="settings-tab" aria-label="Export">
      <h3>Export</h3>
      <p class="settings-hint">
        Save a JSON file with the local repositories paths, the rules (naming and tags) and the
        settings of the View tab (view styling configurations and presets). The GitHub login isn’t
        included.
      </p>
      <label class="export-option">
        <input
          v-model="includeLocalPaths"
          type="checkbox"
          aria-label="Include local path settings"
        />
        Include the settings based on local paths
      </label>
      <p class="settings-hint export-option-hint">
        The local repositories paths and the tag rules tested on the local path. Untick it to share
        the rest with another computer: importing such a file keeps that computer’s own.
      </p>
      <button type="button" class="settings-button" :disabled="busy" @click="exportSettings">
        Export settings…
      </button>
      <p v-if="exported" class="settings-message" role="status">
        Exported to <code>{{ exported.path }}</code>: {{ describe(exported.summary) }}.
      </p>
    </section>

    <section class="settings-tab" aria-label="Import">
      <h3>Import</h3>
      <p class="settings-hint">
        Load a file exported by Grepo. Importing replaces your current local repositories paths,
        rules, views and presets. A file exported without the local-path settings keeps your local
        repositories paths and your tag rules on the local path.
      </p>
      <button type="button" class="settings-button" :disabled="busy" @click="chooseFile">
        Choose a file…
      </button>
      <div v-if="ready" class="import-preview" role="region" aria-label="File to import">
        <p>
          <code>{{ ready.path }}</code> holds {{ describe(ready.summary) }}.
        </p>
        <div class="import-actions">
          <button
            type="button"
            class="settings-button settings-button--primary"
            :disabled="busy"
            @click="applyImport"
          >
            Import and replace my settings
          </button>
          <button type="button" class="settings-button" :disabled="busy" @click="ready = null">
            Cancel
          </button>
        </div>
      </div>
      <p v-if="imported" class="settings-message" role="status">
        Imported from <code>{{ imported.path }}</code>: {{ describe(imported.summary) }}.
      </p>
    </section>

    <p v-if="errorMessage" class="settings-message settings-message--error" role="alert">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import type { IpcApi } from '../../../../shared/ipc-contract'
import type { ExchangeSummary } from '../../../../shared/settings-exchange'
import { loadPresets } from '../../presets/preset-client'

const emit = defineEmits<{
  /** An import was applied: the other tabs have to read their settings again. */
  imported: []
}>()

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

interface Outcome {
  path: string
  summary: ExchangeSummary
}

/** Whether the export holds the settings based on local paths (by default, yes). */
const includeLocalPaths = ref(true)
const busy = ref(false)
const errorMessage = ref('')
const exported = ref<Outcome | null>(null)
const ready = ref<Outcome | null>(null)
const imported = ref<Outcome | null>(null)

/**
 * Writes what a file holds in words.
 *
 * @param summary - the counts.
 */
function describe(summary: ExchangeSummary): string {
  const plural = (count: number, word: string): string =>
    `${count} ${word}${count === 1 ? '' : 's'}`
  return [
    summary.includesLocalPaths
      ? plural(summary.localReposPaths, 'local repositories path')
      : 'no local-path settings',
    plural(summary.namingRules, 'naming rule'),
    plural(summary.tagRules, 'tag rule'),
    plural(summary.views, 'view'),
    plural(summary.presets, 'preset')
  ].join(', ')
}

/**
 * Runs a step of the exchange and shows its answer.
 *
 * @param step - the call.
 * @param failure - what to say when it throws.
 * @returns the answer, `null` when it threw.
 */
async function run(
  step: (api: IpcApi) => ReturnType<IpcApi['exportSettings']>,
  failure: string
): Promise<Awaited<ReturnType<IpcApi['exportSettings']>> | null> {
  if (!api) return null
  busy.value = true
  errorMessage.value = ''
  try {
    const result = await step(api)
    if (result.status === 'error') errorMessage.value = result.message
    return result
  } catch {
    errorMessage.value = failure
    return null
  } finally {
    busy.value = false
  }
}

/** Exports the settings. */
async function exportSettings(): Promise<void> {
  exported.value = null
  const result = await run(
    (api) => api.exportSettings({ includeLocalPaths: includeLocalPaths.value }),
    'The settings couldn’t be exported.'
  )
  if (result?.status === 'done') exported.value = { path: result.path, summary: result.summary }
}

/** Chooses and checks a file to import. */
async function chooseFile(): Promise<void> {
  ready.value = null
  imported.value = null
  const result = await run((api) => api.previewImport(), 'The file couldn’t be read.')
  if (result?.status === 'ready') ready.value = { path: result.path, summary: result.summary }
}

/** Applies the checked file. */
async function applyImport(): Promise<void> {
  const result = await run((api) => api.applyImport(), 'The settings couldn’t be imported.')
  ready.value = null
  if (result?.status === 'done') {
    imported.value = { path: result.path, summary: result.summary }
    await loadPresets()
    emit('imported')
  }
}
</script>

<style src="./settings-form.css"></style>
<style scoped>
.export-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

.export-option-hint {
  margin-top: -8px;
}

.import-preview {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.import-preview p {
  margin: 0 0 8px;
}

.import-actions {
  display: flex;
  gap: 8px;
}
</style>
