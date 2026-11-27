<!--
  The Repos page: the repositories of the local repositories folder (found by the Refresh button
  of Settings → General) as a grid of cards (`RepositoryCard`).

  Above the grid, the toolbar is in two columns:
  - left (left aligned, a fixed 65% of the page width): the search field filtering on the repositories' names, a regular
    expression (`filterRepositories`; an invalid one says why and filters nothing); the checkbox
    selecting every repository the search shows; the action menu ("Open in Github", "Open in
    Circleci", "Open in VSCode", "Open in All") and the Run button running it on the selection;
  - right (right aligned): the Filter icon (funnel), a popover with Org and Tags sections, each
    org and tag a tri-state checkbox (shown, hidden, not set);
    the View icon (the eye): switches the view configuration in use (Settings → View: font size,
    grid item minimum width; the default view at first) and toggles the attributes the cards show
    (org, name, tags, buttons); then the preset icon buttons (floppy disk: save and update, bin:
    delete). A preset keeps the search, the filters, the view and the attributes; its page
    (`/repos/preset/<name>`) opens with them. Presets are managed in Settings → View.

  Each action reports what it did under the toolbar: repositories it had to skip (no GitHub
  remote, no `.circleci` folder) or that failed are listed.
-->
<template>
  <section class="repos-page">
    <header class="repos-header">
      <h2>{{ presetName ?? 'Repos' }}</h2>
      <span class="repos-count">{{ countLabel }}</span>
    </header>

    <div class="repos-toolbar">
      <div class="repos-toolbar-left">
        <label class="repos-search">
          <span class="visually-hidden">Filter repositories</span>
          <input
            v-model="search"
            type="text"
            class="repos-search-input"
            :class="{ 'repos-search-input--invalid': filtered.error !== '' }"
            placeholder="Filter by name (regular expression, e.g. ^shop-.*-(web|bff)$)"
            spellcheck="false"
            aria-label="Filter repositories"
          />
        </label>

        <label class="repos-select-all">
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="someSelected && !allSelected"
            :disabled="visible.length === 0"
            aria-label="Select all displayed repositories"
            @change="toggleAll"
          />
          <span>{{ selectedCount }} selected</span>
        </label>

        <div class="repos-action-menu">
          <label>
            <span class="visually-hidden">Action on the selected repositories</span>
            <select v-model="bulkAction" class="repos-action-select" aria-label="Action">
              <option v-for="action in repositoryActions" :key="action" :value="action">
                Open in {{ repositoryActionLabels[action] }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="repos-run"
            :disabled="selectedCount === 0 || running"
            @click="runOnSelection"
          >
            Run
          </button>
        </div>
      </div>

      <div class="repos-toolbar-right">
        <PopoverMenu label="Filter" :active="hasTagFilter || hasOrgFilter">
          <template #icon><FilterIcon /></template>
          <h3 class="popover-title">Filters</h3>
          <FilterGroup label="Org" :active="hasOrgFilter">
            <p v-if="availableOrgs.length === 0" class="repos-popover-empty">
              No org found: no repository has a GitHub remote.
            </p>
            <TriStateCheckbox
              v-for="org in availableOrgs"
              :key="org"
              :label="org"
              :model-value="orgFilter[org]"
              @update:model-value="
                (state) => (orgFilter = withTriStateValue(orgFilter, org, state))
              "
            />
            <button
              v-if="hasOrgFilter"
              type="button"
              class="repos-clear-tags"
              @click="orgFilter = {}"
            >
              Clear orgs
            </button>
          </FilterGroup>
          <FilterGroup label="Tags" :active="hasTagFilter">
            <p v-if="availableTags.length === 0" class="repos-popover-empty">
              No tags yet. Define tag rules in
              <RouterLink to="/settings/rules">Settings → Rules</RouterLink>.
            </p>
            <TriStateCheckbox
              v-for="tag in availableTags"
              :key="tag"
              :label="tag"
              :model-value="tagFilter[tag]"
              @update:model-value="
                (state) => (tagFilter = withTriStateValue(tagFilter, tag, state))
              "
            />
            <button
              v-if="hasTagFilter"
              type="button"
              class="repos-clear-tags"
              @click="tagFilter = {}"
            >
              Clear tags
            </button>
          </FilterGroup>
        </PopoverMenu>

        <PopoverMenu label="View">
          <template #icon><ViewIcon /></template>
          <h3 class="popover-title">View</h3>
          <FilterGroup label="View configuration" :active="false">
            <label v-for="view in viewConfig.views" :key="view.id" class="repos-view-choice">
              <input
                type="radio"
                name="repos-view"
                :value="view.id"
                :checked="currentView.id === view.id"
                @change="viewId = view.id"
              />
              {{ view.name }}<span v-if="view.id === viewConfig.defaultId"> (default)</span>
            </label>
            <RouterLink to="/settings/view" class="repos-popover-empty">Manage views</RouterLink>
          </FilterGroup>
          <FilterGroup label="Attributes" :active="false">
            <label v-for="key in viewAttributeKeys" :key="key" class="repos-view-choice">
              <input v-model="attributes[key]" type="checkbox" :aria-label="`Show ${key}`" />
              {{ viewAttributeLabels[key] }}
            </label>
          </FilterGroup>
        </PopoverMenu>

        <div class="repos-presets">
          <template v-if="presetName !== null">
            <button
              type="button"
              class="repos-preset-button repos-preset-icon"
              aria-label="Update preset"
              title="Update preset with the current view"
              @click="updatePreset"
            >
              <SaveIcon />
            </button>
            <button
              v-if="!confirmingDelete"
              type="button"
              class="repos-preset-button repos-preset-icon"
              aria-label="Delete preset"
              title="Delete preset"
              @click="confirmingDelete = true"
            >
              <TrashIcon />
            </button>
            <template v-else>
              <span>Delete “{{ presetName }}”?</span>
              <button type="button" class="repos-preset-button" @click="deletePreset">
                Delete
              </button>
              <button type="button" class="repos-preset-button" @click="confirmingDelete = false">
                Cancel
              </button>
            </template>
          </template>
          <template v-else>
            <button
              v-if="!savingPreset"
              type="button"
              class="repos-preset-button repos-preset-icon"
              aria-label="Save preset"
              title="Save preset"
              @click="savingPreset = true"
            >
              <SaveIcon />
            </button>
            <form v-else class="repos-preset-form" @submit.prevent="savePreset">
              <input
                v-model="newPresetName"
                type="text"
                placeholder="Preset name"
                aria-label="Preset name"
                :maxlength="PRESET_NAME_MAX_LENGTH"
              />
              <button
                type="submit"
                class="repos-preset-button"
                :disabled="newPresetName.trim() === ''"
              >
                Save
              </button>
              <button type="button" class="repos-preset-button" @click="savingPreset = false">
                Cancel
              </button>
            </form>
          </template>
        </div>
      </div>
    </div>

    <p v-if="filtered.error" class="repos-message repos-message--error" role="alert">
      Invalid regular expression: {{ filtered.error }}
    </p>
    <p
      v-if="message"
      class="repos-message"
      :class="{ 'repos-message--error': messageIsError }"
      role="status"
    >
      {{ message }}
    </p>
    <ul v-if="problems.length > 0" class="repos-problems">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>

    <p v-if="loadError" class="repos-message repos-message--error" role="alert">
      The repositories couldn’t be read.
    </p>
    <p v-else-if="inventory && inventory.repositories.length === 0" class="repos-empty">
      No repositories yet. Set the local repositories path and click “Refresh” in
      <RouterLink to="/settings/general">Settings → General</RouterLink>.
    </p>
    <p v-else-if="visible.length === 0 && inventory" class="repos-empty">
      No repository matches this search.
    </p>

    <div class="repos-grid" :style="gridStyle">
      <RepositoryCard
        v-for="repository in visible"
        :key="repository.path"
        :repository="repository"
        :selected="selection.has(repository.path)"
        :attributes="attributes"
        :tag-color-overrides="tagColorOverrides"
        :github-logged-in="githubLoggedIn"
        @toggle="toggle(repository.path)"
        @run="(action) => run(action, [repository])"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { IpcApi } from '../../../shared/ipc-contract'
import {
  filterRepositories,
  type Repository,
  type RepositoryInventory
} from '../../../shared/repository'
import {
  repositoryActionLabels,
  repositoryActions,
  type RepositoryActionChoice
} from '../../../shared/repository-actions'
import {
  PRESET_NAME_MAX_LENGTH,
  presetRoute,
  type PresetFilter,
  type TagFilter
} from '../../../shared/repository-presets'
import FilterGroup from '../components/FilterGroup.vue'
import FilterIcon from '../components/icons/FilterIcon.vue'
import SaveIcon from '../components/icons/SaveIcon.vue'
import TrashIcon from '../components/icons/TrashIcon.vue'
import ViewIcon from '../components/icons/ViewIcon.vue'
import PopoverMenu from '../components/PopoverMenu.vue'
import RepositoryCard from '../components/RepositoryCard.vue'
import TriStateCheckbox from '../components/TriStateCheckbox.vue'
import {
  allAttributes,
  DEFAULT_VIEW,
  resolveView,
  viewAttributeKeys,
  viewAttributeLabels,
  type RepoViews,
  type ViewAttributes
} from '../../../shared/repo-views'
import { passesTriStateFacet, withTriStateValue } from '../filters/tri-state-facet'
import { loadPresets, presets } from '../presets/preset-client'
import { loadMainPageState, saveMainPageState } from '../repos/main-page-state'
import { summarizeOutcomes } from '../repos/summarize-outcomes'

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api
const route = useRoute()
const router = useRouter()

const inventory = ref<RepositoryInventory | null>(null)
const loadError = ref(false)
const search = ref('')
const selection = ref(new Set<string>())
const bulkAction = ref<RepositoryActionChoice>('github')
const running = ref(false)
const message = ref('')
const messageIsError = ref(false)
const problems = ref<string[]>([])

const savingPreset = ref(false)
const newPresetName = ref('')
const confirmingDelete = ref(false)

/** The preset the page is open on, `null` on Repos itself. */
const presetName = computed<string | null>(() =>
  route.name === 'repos-preset' ? String(route.params.presetName) : null
)

const filtered = computed(() =>
  filterRepositories(inventory.value?.repositories ?? [], search.value)
)
const tagFilter = ref<TagFilter>({})
const viewConfig = ref<RepoViews>({ views: [{ ...DEFAULT_VIEW }], defaultId: DEFAULT_VIEW.id })
/** The id of the view in use; empty: the default view. */
const viewId = ref('')
/** The colors chosen for tags in Settings. */
const tagColorOverrides = ref<Record<string, string>>({})
/** Whether the user is logged in to GitHub (the cards' pull requests button needs it). */
const githubLoggedIn = ref(false)
const attributes = ref<ViewAttributes>(allAttributes())
const currentView = computed(() => resolveView(viewConfig.value, viewId.value))
/** The style of the grid, from the view in use. */
const gridStyle = computed(() => ({
  fontSize: `${currentView.value.fontSize}px`,
  gridTemplateColumns: `repeat(auto-fill, minmax(${currentView.value.minItemWidth}px, 1fr))`
}))
const orgFilter = ref<TagFilter>({})
const hasOrgFilter = computed(() => Object.keys(orgFilter.value).length > 0)
/** Every org some repository belongs to, sorted. */
const availableOrgs = computed(() =>
  [
    ...new Set(
      (inventory.value?.repositories ?? []).flatMap((repository) =>
        repository.github ? [repository.github.org] : []
      )
    )
  ].sort((a, b) => a.localeCompare(b))
)
const hasTagFilter = computed(() => Object.keys(tagFilter.value).length > 0)
/** Every tag some repository has, sorted. */
const availableTags = computed(() =>
  [...new Set((inventory.value?.repositories ?? []).flatMap((repository) => repository.tags))].sort(
    (a, b) => a.localeCompare(b)
  )
)
/** The repositories the search and the tag filter keep. */
const visible = computed(() =>
  filtered.value.repositories.filter(
    (repository) =>
      passesTriStateFacet(tagFilter.value, (tag) => repository.tags.includes(tag)) &&
      passesTriStateFacet(orgFilter.value, (org) => repository.github?.org === org)
  )
)
const selectedVisible = computed(() => visible.value.filter((r) => selection.value.has(r.path)))
const selectedCount = computed(() => selectedVisible.value.length)
const allSelected = computed(
  () => visible.value.length > 0 && selectedCount.value === visible.value.length
)
const someSelected = computed(() => selectedCount.value > 0)
const countLabel = computed(() => {
  const total = inventory.value?.repositories.length ?? 0
  return visible.value.length === total
    ? `${total} repositories`
    : `${visible.value.length} of ${total} repositories`
})

/** Reads whether the user is logged in to GitHub. */
async function loadGithubLogin(): Promise<void> {
  if (!api) return
  try {
    githubLoggedIn.value = (await api.getGithubLogin()).loggedIn
  } catch {
    githubLoggedIn.value = false
  }
}

/** Reads the tag colors defined in Settings. */
async function loadTagColors(): Promise<void> {
  if (!api) return
  try {
    tagColorOverrides.value = (await api.getRepoRules()).tagColors
  } catch {
    // The colors showing stay.
  }
}

/** Reads the views defined in Settings. */
async function loadViews(): Promise<void> {
  if (!api) return
  try {
    viewConfig.value = await api.getRepoViews()
  } catch {
    // The views showing stay.
  }
}

/** Reads the repositories saved by the last inspection. */
async function loadRepositories(): Promise<void> {
  if (!api) return
  try {
    inventory.value = await api.getRepositories()
    loadError.value = false
  } catch {
    loadError.value = true
  }
}

/** Shows the state the Repos page had before (its own, never a preset's), else the defaults. */
function restoreMainState(): void {
  const state = loadMainPageState()
  search.value = state?.search ?? ''
  tagFilter.value = { ...state?.tagFilter }
  orgFilter.value = { ...state?.orgFilter }
  viewId.value = state?.viewId ?? ''
  attributes.value = state?.attributes ?? allAttributes()
}

/**
 * Shows the state of the page the route opens: the preset's, or the Repos page's own state. An
 * unknown preset opens Repos.
 */
function applyPresetFromRoute(): void {
  confirmingDelete.value = false
  savingPreset.value = false
  if (presetName.value === null) return restoreMainState()
  const preset = presets.value.find((other) => other.name === presetName.value)
  if (preset) {
    search.value = preset.search
    tagFilter.value = { ...preset.tagFilter }
    orgFilter.value = { ...preset.orgFilter }
    viewId.value = preset.viewId
    attributes.value = { ...preset.attributes }
  } else if (presets.value.length > 0) void router.replace('/repos')
}

onMounted(async () => {
  await Promise.all([
    loadRepositories(),
    loadPresets(),
    loadViews(),
    loadTagColors(),
    loadGithubLogin()
  ])
  applyPresetFromRoute()
})
// Entering or leaving a preset's page loads that page's own state.
watch(presetName, applyPresetFromRoute)
// The presets were read again (a save, an import): the open preset's page follows them.
watch(presets, () => {
  if (presetName.value !== null) applyPresetFromRoute()
})
// The Repos page's own state is remembered as it changes, not a preset's visit.
watch(
  () => ({
    search: search.value,
    tagFilter: tagFilter.value,
    orgFilter: orgFilter.value,
    viewId: viewId.value,
    attributes: attributes.value
  }),
  (state) => {
    if (presetName.value === null) saveMainPageState(state)
  },
  { deep: true }
)
// The selection only holds repositories the search still shows.
watch(visible, (repositories) => {
  const shown = new Set(repositories.map((repository) => repository.path))
  selection.value = new Set([...selection.value].filter((path) => shown.has(path)))
})
// A "Refresh" made in Settings is read again when the page comes back.
const refreshOnFocus = (): void => {
  void loadRepositories()
  void loadViews()
  void loadTagColors()
  void loadGithubLogin()
}
window.addEventListener('focus', refreshOnFocus)
onUnmounted(() => window.removeEventListener('focus', refreshOnFocus))

/**
 * Selects or unselects a repository.
 *
 * @param path - the repository's path.
 */
function toggle(path: string): void {
  const next = new Set(selection.value)
  if (!next.delete(path)) next.add(path)
  selection.value = next
}

/** Selects every displayed repository, or none when all are. */
function toggleAll(): void {
  selection.value = allSelected.value ? new Set() : new Set(visible.value.map((r) => r.path))
}

/**
 * Runs an action on repositories and says what it did.
 *
 * @param action - the action.
 * @param repositories - the repositories.
 */
async function run(
  action: RepositoryActionChoice,
  repositories: readonly Repository[]
): Promise<void> {
  if (!api || repositories.length === 0) return
  running.value = true
  problems.value = []
  message.value = ''
  try {
    const outcomes = await api.runRepositoryAction(
      action,
      repositories.map((repository) => repository.path)
    )
    const summary = summarizeOutcomes(outcomes)
    problems.value = summary.problems
    messageIsError.value = summary.done === 0 && summary.problems.length > 0
    message.value = `${repositoryActionLabels[action]}: ${summary.done} done${
      summary.problems.length > 0 ? `, ${summary.problems.length} not done` : ''
    }.`
  } catch {
    messageIsError.value = true
    message.value = `${repositoryActionLabels[action]} failed.`
  } finally {
    running.value = false
  }
}

/** Runs the menu's action on the selected repositories. */
function runOnSelection(): Promise<void> {
  return run(bulkAction.value, selectedVisible.value)
}

/**
 * Reports a preset change that was refused.
 *
 * @param result - what the main process answered.
 * @param failure - what to say when it didn't say why.
 * @returns whether it was accepted.
 */
function accepted(result: { success: boolean; message?: string }, failure: string): boolean {
  messageIsError.value = !result.success
  message.value = result.success ? '' : (result.message ?? failure)
  return result.success
}

/** The search text and filters, as a preset saves them (plain data, safe to send over IPC). */
function currentFilter(): PresetFilter {
  // Plain copies: a reactive proxy can't cross the IPC boundary (it isn't structured-cloneable).
  return {
    search: search.value,
    tagFilter: { ...tagFilter.value },
    orgFilter: { ...orgFilter.value },
    viewId: currentView.value.id,
    attributes: { ...attributes.value }
  }
}

/** Saves the search as a new preset and opens the page on it. */
async function savePreset(): Promise<void> {
  if (!api) return
  const name = newPresetName.value.trim()
  try {
    if (!accepted(await api.savePreset(name, currentFilter()), 'The preset couldn’t be saved.'))
      return
  } catch {
    return void accepted({ success: false }, 'The preset couldn’t be saved.')
  }
  newPresetName.value = ''
  savingPreset.value = false
  await loadPresets()
  await router.push(presetRoute(name))
}

/** Replaces the open preset's search with the current one. */
async function updatePreset(): Promise<void> {
  if (!api || presetName.value === null) return
  try {
    if (
      !accepted(
        await api.updatePreset(presetName.value, currentFilter()),
        'The preset couldn’t be updated.'
      )
    )
      return
    message.value = 'Preset updated.'
  } catch {
    return void accepted({ success: false }, 'The preset couldn’t be updated.')
  }
  await loadPresets()
}

/** Deletes the open preset and goes back to Repos. */
async function deletePreset(): Promise<void> {
  if (!api || presetName.value === null) return
  try {
    if (!accepted(await api.deletePreset(presetName.value), 'The preset couldn’t be deleted.'))
      return
  } catch {
    return void accepted({ success: false }, 'The preset couldn’t be deleted.')
  }
  confirmingDelete.value = false
  await loadPresets()
  // Back on Repos, its own state comes back (the deleted preset's is dropped with its page).
  await router.push('/repos')
}
</script>

<style scoped>
.popover-title {
  margin: 0 0 8px;
  font-size: 1em;
}

.repos-popover-empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.repos-view-choice {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.repos-preset-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  color: var(--color-text-muted);
}

.repos-preset-icon:not(:disabled):hover {
  color: var(--color-text);
}

.repos-clear-tags {
  font-size: 0.85em;
}

.repos-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 24px;
}

.repos-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.repos-header h2 {
  margin: 0;
}

.repos-count {
  color: var(--color-text-muted);
}

.repos-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* Two columns: the search to the Run button on the left, the filters to the save buttons on the right. */
.repos-toolbar-left,
.repos-toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.repos-toolbar-left {
  /* A fixed 65% of the page width. */
  flex: 0 0 65%;
  max-width: 65%;
  box-sizing: border-box;
  justify-content: flex-start;
}

.repos-toolbar-right {
  flex: 0 0 auto;
  justify-content: flex-end;
  /* Level with the first row of the left column, which may wrap in its 65%. */
  align-self: flex-start;
  margin-left: auto;
}

.repos-search {
  flex: 1 1 240px;
  min-width: 200px;
}

.repos-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: ui-monospace, monospace;
}

.repos-search-input:focus {
  outline: 1px solid var(--color-accent);
}

.repos-search-input--invalid {
  border-color: var(--color-danger);
}

.repos-select-all,
.repos-action-menu,
.repos-presets,
.repos-preset-form {
  display: flex;
  align-items: center;
  gap: 8px;
}

button,
select {
  padding: 5px 12px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

button:not(:disabled):hover {
  background: var(--color-surface-active);
}

.repos-run {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}

.repos-run:not(:disabled):hover {
  background: var(--color-accent);
  filter: brightness(1.1);
}

.repos-preset-form input {
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface);
  color: var(--color-text);
}

.repos-message {
  margin: 0;
  color: var(--color-text-secondary);
}

.repos-message--error {
  color: var(--color-danger);
}

.repos-problems {
  margin: 0;
  padding-left: 20px;
  color: var(--color-warning);
}

.repos-empty {
  color: var(--color-text-muted);
}

.repos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
