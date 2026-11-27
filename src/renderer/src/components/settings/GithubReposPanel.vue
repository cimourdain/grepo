<!--
  The "Repositories" part of the Github tab, shown once logged in: "Inspect repositories" lists
  the repositories of which an enabled team is a code owner (named in its CODEOWNERS file), among
  the repositories the enabled teams have access to. Each is marked "cloned" (found locally, with
  its path) or "missing". A missing one has its own folder field (suggesting the local
  repositories paths; empty: the first of them) and a Clone button; cloning goes through SSH, into
  a folder of the repository's name inside that folder.

  The result of the last inspection is saved locally and shown again when the tab opens, brought
  up to date with the local repositories; "Inspect repositories" asks GitHub again.
-->
<template>
  <section class="settings-tab" aria-label="Repositories">
    <h3>Repositories</h3>
    <p class="settings-hint">
      List the repositories an enabled team is a code owner of, and clone the ones that are missing
      on this computer.
    </p>
    <div class="github-repos-actions">
      <button
        type="button"
        class="settings-button settings-button--primary"
        :disabled="loading"
        @click="inspect"
      >
        {{ loading ? 'Inspecting…' : 'Inspect repositories' }}
      </button>
      <span v-if="repositories" class="settings-hint">
        {{ repositories.length }} found · {{ missingCount }} missing<template v-if="inspectedAt">
          · inspected {{ new Date(inspectedAt).toLocaleString() }}</template
        >
      </span>
    </div>
    <p v-if="errorMessage" class="settings-message settings-message--error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-if="repositories && repositories.length === 0" class="settings-hint">
      No repository has an enabled team as code owner.
    </p>
    <datalist id="github-clone-paths">
      <option v-for="path in localPaths" :key="path" :value="path"></option>
    </datalist>
    <ul v-if="repositories" class="remote-list" aria-label="Repositories of the enabled teams">
      <li v-for="repository in repositories" :key="repository.fullName" class="remote">
        <div class="remote-main">
          <a :href="repository.htmlUrl" target="_blank" rel="noopener noreferrer">{{
            repository.fullName
          }}</a>
          <span class="remote-teams">{{ repository.teams.join(', ') }}</span>
        </div>
        <span
          class="remote-status"
          :class="`remote-status--${repository.status}`"
          :title="repository.localPath"
          >{{ repository.status }}</span
        >
        <template v-if="repository.status === 'missing'">
          <input
            v-model="clonePaths[repository.fullName]"
            type="text"
            class="remote-clone-path"
            list="github-clone-paths"
            :placeholder="defaultClonePath"
            spellcheck="false"
            :aria-label="`Clone ${repository.fullName} into`"
            title="Folder to clone into (a folder of the repository's name is created inside); empty: the first local repositories path"
          />
          <button
            type="button"
            class="remote-clone"
            :disabled="cloning.has(repository.fullName)"
            :aria-label="`Clone ${repository.fullName}`"
            @click="clone(repository)"
          >
            {{ cloning.has(repository.fullName) ? 'Cloning…' : 'Clone' }}
          </button>
        </template>
        <span v-else class="remote-path">{{ repository.localPath }}</span>
        <p v-if="cloneErrors[repository.fullName]" class="remote-error" role="alert">
          {{ cloneErrors[repository.fullName] }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import type { RemoteRepository } from '../../../../shared/github-orgs'
import type { IpcApi } from '../../../../shared/ipc-contract'

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

/** The folder to clone each repository into, by full name; empty: the default. */
const clonePaths = reactive<Record<string, string>>({})
const localPaths = ref<string[]>([])
const inspectedAt = ref('')
const defaultClonePath = ref('${HOME}')
const repositories = ref<RemoteRepository[] | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const cloning = ref(new Set<string>())
const cloneErrors = reactive<Record<string, string>>({})

const missingCount = computed(
  () => (repositories.value ?? []).filter((repository) => repository.status === 'missing').length
)

onMounted(async () => {
  try {
    const settings = await api?.getSettings()
    if (settings) {
      localPaths.value = settings.localReposPaths
      defaultClonePath.value = settings.localReposPaths[0] ?? defaultClonePath.value
    }
  } catch {
    // The placeholder stays.
  }
  // The result of the last inspection, saved locally: nothing is asked of GitHub.
  try {
    const saved = await api?.getGithubRepositories()
    if (saved?.success && saved.inspectedAt !== '') {
      repositories.value = saved.repositories
      inspectedAt.value = saved.inspectedAt
    }
  } catch {
    // Nothing to show until an inspection.
  }
})

/** Inspects the repositories. */
async function inspect(): Promise<void> {
  if (!api) return
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await api.inspectGithubRepositories()
    if (result.success) {
      repositories.value = result.repositories
      inspectedAt.value = result.inspectedAt
    } else errorMessage.value = result.message
  } catch {
    errorMessage.value = 'The repositories couldn’t be inspected.'
  } finally {
    loading.value = false
  }
}

/**
 * Clones a missing repository, and marks it cloned.
 *
 * @param repository - the repository.
 */
async function clone(repository: RemoteRepository): Promise<void> {
  if (!api) return
  delete cloneErrors[repository.fullName]
  cloning.value = new Set(cloning.value).add(repository.fullName)
  try {
    const result = await api.cloneGithubRepository(
      repository.org,
      repository.name,
      clonePaths[repository.fullName] ?? ''
    )
    if (result.success) {
      repository.status = 'cloned'
      repository.localPath = result.path
    } else cloneErrors[repository.fullName] = result.message
  } catch {
    cloneErrors[repository.fullName] = 'The clone failed.'
  } finally {
    const next = new Set(cloning.value)
    next.delete(repository.fullName)
    cloning.value = next
  }
}
</script>

<style src="./settings-form.css"></style>
<style scoped>
.github-repos-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.remote-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.remote {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.remote-main {
  display: flex;
  flex: 1 1 280px;
  flex-direction: column;
  min-width: 0;
}

.remote-teams,
.remote-path {
  color: var(--color-text-muted);
  font-size: 0.85em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remote-status {
  padding: 1px 10px;
  border-radius: 999px;
  font-size: 0.85em;
}

.remote-status--cloned {
  background: var(--color-success-surface);
  color: var(--color-success);
}

.remote-status--missing {
  background: var(--color-warning-surface);
  color: var(--color-warning);
}

.remote-clone-path {
  width: 16em;
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-background);
  color: var(--color-text);
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
}

.remote-clone {
  padding: 3px 12px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
}

.remote-clone:disabled {
  opacity: 0.5;
  cursor: default;
}

.remote-error {
  flex-basis: 100%;
  margin: 0;
  color: var(--color-danger);
}
</style>
