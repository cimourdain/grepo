<!--
  The General tab of Settings, in two sections:

  - Local repositories: what the paths are (inspected recursively to identify the git repositories
    of this computer), the form with the paths (one or several folders; default `${HOME}`;
    `~`, `$HOME` and `${HOME}` are understood), then the Refresh button inspecting them to update
    the repositories the Repos page lists;
  - Configuration: the local configuration path (where the app keeps its settings, presets and
    inspected repositories; default `${HOME}/.config/grepo`).

  There is no Save button: the repositories paths are saved by themselves once valid (at least
  one, each absolute), after a short pause; the configuration path is saved when its field is left
  or Enter is pressed (not at each key: saving moves the configuration, copying its files to the
  new folder).
-->
<template>
  <section class="settings-tab">
    <section class="settings-tab" aria-label="Local repositories">
      <h3>Local repositories</h3>
      <p class="settings-hint">
        These are the paths inspected recursively (up to three folders deep) to identify the git
        repositories on this computer, the ones the Repos page lists. A folder holding a
        <code>.git</code> entry is a repository.
      </p>
      <form class="settings-tab" @submit.prevent>
        <div class="settings-field" role="group" aria-label="Local repositories paths">
          <ul class="path-list">
            <li v-for="(_, index) in reposPaths" :key="index" class="path-row">
              <input
                v-model="reposPaths[index]"
                type="text"
                :placeholder="defaults.reposPath"
                spellcheck="false"
                :aria-label="`Local repositories path ${index + 1}`"
              />
              <button
                type="button"
                :disabled="reposPaths.length === 1"
                :aria-label="`Remove path ${index + 1}`"
                @click="reposPaths.splice(index, 1)"
              >
                Remove
              </button>
            </li>
          </ul>
          <button type="button" class="settings-button" @click="reposPaths.push('')">
            Add a path
          </button>
          <small class="settings-hint">
            All the paths are inspected together. Default: <code>{{ defaults.reposPath }}</code>
          </small>
        </div>
        <AutoSaveStatusLine
          :status="reposAutoSave.status.value"
          :message="reposAutoSave.message.value"
        />
      </form>
      <button
        type="button"
        class="settings-button"
        :disabled="refreshing"
        @click="refreshRepositories"
      >
        {{ refreshing ? 'Inspecting…' : 'Refresh' }}
      </button>
      <p v-if="refreshMessage" class="settings-message" role="status">{{ refreshMessage }}</p>
      <p v-if="refreshError" class="settings-message settings-message--error" role="alert">
        {{ refreshError }}
      </p>
    </section>

    <section class="settings-tab" aria-label="Configuration">
      <h3>Configuration</h3>
      <label class="settings-field">
        <span>Local configuration path</span>
        <input
          v-model="configPath"
          type="text"
          :placeholder="defaults.configPath"
          spellcheck="false"
          aria-label="Local configuration path"
          @change="saveConfigPath"
        />
        <small class="settings-hint">
          Where Grepo saves its settings, presets and repositories. Saved when you leave the field.
          Default: <code>{{ defaults.configPath }}</code>
        </small>
      </label>
      <AutoSaveStatusLine :status="configStatus" :message="configMessage" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { expandPath, isAbsolutePath } from '../../../../shared/app-settings'
import type { IpcApi } from '../../../../shared/ipc-contract'
import { useAutoSave, type AutoSaveStatus } from '../../settings/use-auto-save'
import AutoSaveStatusLine from './AutoSaveStatus.vue'

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

const configPath = ref('')
/** The configuration path in use, to tell whether the field changed it. */
let savedConfigPath = ''
const reposPaths = ref<string[]>([''])
const defaults = reactive({ configPath: '${HOME}/.config/grepo', reposPath: '${HOME}' })
const configStatus = ref<AutoSaveStatus>('idle')
const configMessage = ref('')
const refreshing = ref(false)
const refreshMessage = ref('')
const refreshError = ref('')

/**
 * Tells what is wrong with the repositories paths.
 *
 * @param paths - the paths as typed.
 */
function validatePaths(paths: string[]): string {
  const typed = paths.map((path) => path.trim()).filter((path) => path !== '')
  if (typed.length === 0) return 'give at least one local repositories path.'
  const relative = typed.find((path) => !isAbsolutePath(expandPath(path, '/h')))
  return relative ? `“${relative}” is not an absolute path.` : ''
}

const reposAutoSave = useAutoSave({
  source: () => reposPaths.value.map((path) => path.trim()).filter((path) => path !== ''),
  validate: (paths) => validatePaths(paths),
  save: async (paths) => api?.saveGeneralSettings({ localReposPaths: paths }) ?? { success: true }
})

onMounted(async () => {
  if (!api) return
  try {
    const settings = await api.getSettings()
    configPath.value = settings.configPath
    savedConfigPath = settings.configPath
    reposPaths.value = [...settings.localReposPaths]
    defaults.configPath = settings.defaultConfigPath
    defaults.reposPath = settings.defaultLocalReposPath
    reposAutoSave.markSaved()
  } catch {
    configStatus.value = 'error'
    configMessage.value = 'The settings couldn’t be read.'
  }
})

/** Saves the configuration path once the field is left, when it is valid and changed. */
async function saveConfigPath(): Promise<void> {
  if (!api) return
  const typed = configPath.value.trim()
  if (typed === savedConfigPath.trim()) return
  if (typed === '') {
    configStatus.value = 'invalid'
    configMessage.value = 'give a configuration path.'
    return
  }
  if (!isAbsolutePath(expandPath(typed, '/h'))) {
    configStatus.value = 'invalid'
    configMessage.value = 'the configuration path must be absolute.'
    return
  }
  configStatus.value = 'saving'
  try {
    const result = await api.saveGeneralSettings({ configPath: typed })
    if (result.success) {
      configStatus.value = 'saved'
      configMessage.value = ''
      savedConfigPath = typed
    } else {
      configStatus.value = 'error'
      configMessage.value = result.message
    }
  } catch {
    configStatus.value = 'error'
    configMessage.value = 'The configuration path couldn’t be saved.'
  }
}

/** Inspects the local repositories folders (the paths are saved first). */
async function refreshRepositories(): Promise<void> {
  if (!api) return
  refreshing.value = true
  refreshMessage.value = ''
  refreshError.value = ''
  try {
    await reposAutoSave.flush()
    const result = await api.refreshRepositories()
    if (result.success) {
      const count = result.inventory.repositories.length
      refreshMessage.value = `${count} ${count === 1 ? 'repository' : 'repositories'} found in ${result.inventory.scannedPaths.join(', ')}.`
    } else refreshError.value = result.message
  } catch {
    refreshError.value = 'The repositories couldn’t be inspected.'
  } finally {
    refreshing.value = false
  }
}
</script>

<style src="./settings-form.css"></style>
<style scoped>
.path-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.path-row {
  display: flex;
  gap: 8px;
}

.path-row input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: ui-monospace, monospace;
}

.path-row button {
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
}

.path-row button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
