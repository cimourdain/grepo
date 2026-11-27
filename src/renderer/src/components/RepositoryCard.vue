<!--
  One repository of the Repos grid: a checkbox selecting it for the action menu, its clean name
  as the title, its tags, its org and its name (two lines), its local path, and the buttons (the attributes the page's
  View menu hides are left out: org, name, tags, buttons) running an action on this
  repository only (Github, Circleci, VSCode, All).

  Usage:
    <RepositoryCard :repository="repository" :selected="false" @toggle="…" @run="…" />
-->
<template>
  <article class="repository-card" :class="{ 'repository-card--selected': selected }">
    <header class="repository-card-header">
      <input
        type="checkbox"
        class="repository-card-select"
        :checked="selected"
        :aria-label="`Select ${repository.cleanName}`"
        @change="emit('toggle')"
      />
      <h3 class="repository-card-title" :title="repository.cleanName">
        <template v-for="(part, index) in repository.cleanParts" :key="index">
          <template v-if="part.type === 'text'">{{ part.text }}</template>
          <img
            v-else-if="part.src"
            :src="part.src"
            class="repository-card-title-image"
            alt=""
            :title="part.path"
          />
          <span
            v-else
            class="repository-card-title-missing"
            :title="`Image not found: ${part.path}`"
            >?</span
          >
        </template>
      </h3>
    </header>
    <div v-if="attributes.org || attributes.name" class="repository-card-identity">
      <p v-if="attributes.org" class="repository-card-attribute repository-card-org" title="Org">
        {{ repository.github?.org ?? '—' }}
      </p>
      <p
        v-if="attributes.name"
        class="repository-card-attribute repository-card-name"
        title="Repository name"
      >
        {{ repository.github?.name ?? repository.folderName }}
      </p>
    </div>
    <ul
      v-if="attributes.tags && repository.tags.length > 0"
      class="repository-card-tags"
      aria-label="Tags"
    >
      <li
        v-for="tag in repository.tags"
        :key="tag"
        class="repository-card-tag"
        :style="{
          background: tagColors(tag, tagColorOverrides).background,
          color: tagColors(tag, tagColorOverrides).foreground
        }"
      >
        {{ tag }}
      </li>
    </ul>
    <p class="repository-card-path" :title="repository.path">{{ repository.path }}</p>
    <div v-if="attributes.buttons" class="repository-card-actions">
      <button
        v-for="action in repositoryActions"
        :key="action"
        type="button"
        :class="`repository-card-action repository-card-action--${action}`"
        @click="emit('run', action)"
      >
        {{ repositoryActionLabels[action] }}
      </button>
      <button
        v-if="githubLoggedIn && repository.github"
        type="button"
        class="repository-card-action repository-card-action--pull-requests"
        :class="{ 'repository-card-action--on': pullRequestsOpen }"
        aria-label="My pull requests"
        title="My open pull requests on this repository"
        :aria-expanded="pullRequestsOpen"
        @click="togglePullRequests"
      >
        <GitMergeIcon />
      </button>
    </div>
    <div
      v-if="pullRequestsOpen"
      class="repository-card-pull-requests"
      role="region"
      aria-label="My pull requests"
    >
      <p v-if="pullRequestsLoading" class="repository-card-pr-message">Loading pull requests…</p>
      <p
        v-else-if="pullRequestsError"
        class="repository-card-pr-message repository-card-pr-error"
        role="alert"
      >
        {{ pullRequestsError }}
      </p>
      <p v-else-if="pullRequests.length === 0" class="repository-card-pr-message">
        No open pull request by you.
      </p>
      <ul v-else class="repository-card-pr-list">
        <li v-for="pullRequest in pullRequests" :key="pullRequest.number">
          <a
            :href="pullRequest.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="pullRequest.url"
          >
            #{{ pullRequest.number }} {{ pullRequest.title }}
          </a>
          <span v-if="pullRequest.draft" class="repository-card-pr-draft">draft</span>
        </li>
      </ul>
    </div>
  </article>
</template>

<script setup lang="ts">
import { allAttributes, type ViewAttributes } from '../../../shared/repo-views'
import { ref } from 'vue'

import type { PullRequest } from '../../../shared/github-orgs'
import type { IpcApi } from '../../../shared/ipc-contract'
import GitMergeIcon from './icons/GitMergeIcon.vue'
import { tagColors } from '../../../shared/tag-colors'
import type { Repository } from '../../../shared/repository'
import {
  repositoryActionLabels,
  repositoryActions,
  type RepositoryActionChoice
} from '../../../shared/repository-actions'

const props = withDefaults(
  defineProps<{
    repository: Repository
    /** Whether it is selected for the action menu. */
    selected: boolean
    /** Which attributes the card shows; all by default. */
    attributes?: ViewAttributes
    /** The colors chosen for tags in Settings, by tag; the others get an automatic color. */
    tagColorOverrides?: Record<string, string>
    /** Whether the user is logged in to GitHub: the pull requests button needs it. */
    githubLoggedIn?: boolean
  }>(),
  { attributes: () => allAttributes(), tagColorOverrides: () => ({}), githubLoggedIn: false }
)

const pullRequestsOpen = ref(false)
const pullRequestsLoading = ref(false)
const pullRequestsError = ref('')
const pullRequests = ref<PullRequest[]>([])

/** Shows or hides the user's open pull requests on this repository, reading them when shown. */
async function togglePullRequests(): Promise<void> {
  if (pullRequestsOpen.value) {
    pullRequestsOpen.value = false
    return
  }
  const github = props.repository.github
  const api = (window as { api?: IpcApi }).api
  if (!github || !api) return
  pullRequestsOpen.value = true
  pullRequestsLoading.value = true
  pullRequestsError.value = ''
  try {
    const result = await api.listMyPullRequests(github.org, github.name)
    if (result.success) pullRequests.value = result.pullRequests
    else pullRequestsError.value = result.message
  } catch {
    pullRequestsError.value = 'The pull requests couldn’t be read.'
  } finally {
    pullRequestsLoading.value = false
  }
}

const emit = defineEmits<{
  toggle: []
  /** One of the card's buttons was clicked. */
  run: [action: RepositoryActionChoice]
}>()
</script>

<style scoped>
.repository-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.repository-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.repository-card--selected {
  border-color: var(--color-accent);
}

.repository-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.repository-card-title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 1.05em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repository-card-title-image {
  height: 1.3em;
  width: auto;
  flex-shrink: 0;
}

.repository-card-title-missing {
  color: var(--color-warning);
}

.repository-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.repository-card-tag {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.78em;
}

.repository-card-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}

.repository-card-attribute {
  margin: 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repository-card-path {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repository-card-path {
  color: var(--color-text-muted);
  font-family: ui-monospace, monospace;
  font-size: 0.8em;
}

.repository-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.repository-card-action {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.repository-card-action:hover {
  background: var(--color-surface-active);
  color: var(--color-text);
}

.repository-card-action--pull-requests {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
}

.repository-card-action--on {
  background: var(--color-surface-active);
  color: var(--color-text);
}

.repository-card-pull-requests {
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
  font-size: 0.9em;
}

.repository-card-pr-message {
  margin: 0;
  color: var(--color-text-muted);
}

.repository-card-pr-error {
  color: var(--color-danger);
}

.repository-card-pr-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.repository-card-pr-list a {
  color: var(--color-accent);
  overflow-wrap: anywhere;
}

.repository-card-pr-draft {
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--color-neutral-surface);
  color: var(--color-text-muted);
  font-size: 0.8em;
}

.repository-card-action--all {
  background: var(--color-accent-surface);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
</style>
