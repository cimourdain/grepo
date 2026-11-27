<!--
  The "Organizations and teams" part of the Github tab, shown once logged in: the account's
  organizations, each with the account's teams in it, as nested checkboxes. A disabled
  organization (or team) is left out of the repositories inspection; everything starts enabled.
  The first time, the account is inspected on its own; "Refresh" inspects it again. Each checkbox
  is saved at once. Emits `change` when the selection changes, for the repositories panel.

  Needs the token's `read:org` scope to list the teams.
-->
<template>
  <section class="settings-tab" aria-label="Organizations and teams">
    <h3>Organizations and teams</h3>
    <p class="settings-hint">
      Enable the organizations and teams to look at. Only enabled teams count when inspecting
      repositories. Listing teams needs the <code>read:org</code> scope on the token.
    </p>
    <div class="github-orgs-actions">
      <button type="button" class="settings-button" :disabled="loading" @click="inspect">
        {{ loading ? 'Inspecting…' : 'Refresh organizations and teams' }}
      </button>
      <span v-if="view?.inspection" class="settings-hint">
        Last inspected {{ new Date(view.inspection.inspectedAt).toLocaleString() }}
      </span>
    </div>
    <p v-if="errorMessage" class="settings-message settings-message--error" role="alert">
      {{ errorMessage }}
    </p>
    <p
      v-if="view?.inspection?.ssoRequired?.length"
      class="settings-message settings-message--warning sso-warning"
      role="alert"
    >
      GitHub hides the teams of {{ view.inspection.ssoRequired.join(', ') }}: the token is not
      authorized for the organization’s SAML single sign-on. On
      <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer"
        >github.com/settings/tokens</a
      >, open the token, click “Configure SSO”, authorize the organization, then refresh.
    </p>
    <p v-if="view?.inspection && view.inspection.orgs.length === 0" class="settings-hint">
      This account belongs to no organization.
    </p>
    <ul v-if="view?.inspection" class="org-list">
      <li v-for="org in view.inspection.orgs" :key="org.login" class="org">
        <label class="org-name">
          <input
            type="checkbox"
            :checked="orgEnabled(org.login)"
            :aria-label="`Enable the organization ${org.login}`"
            @change="toggleOrg(org.login, ($event.target as HTMLInputElement).checked)"
          />
          {{ org.login }}
        </label>
        <p v-if="org.teams.length === 0" class="settings-hint org-no-teams">
          {{
            isSsoHidden(org.login)
              ? 'Teams hidden: the token needs the organization’s SSO authorization.'
              : 'You belong to no team of this organization.'
          }}
        </p>
        <ul class="team-list">
          <li v-for="team in org.teams" :key="team.slug">
            <label class="team" :class="{ 'team--off': !orgEnabled(org.login) }">
              <input
                type="checkbox"
                :checked="orgEnabled(org.login) && teamEnabled(org.login, team.slug)"
                :disabled="!orgEnabled(org.login)"
                :aria-label="`Enable the team ${org.login}/${team.slug}`"
                @change="
                  toggleTeam(org.login, team.slug, ($event.target as HTMLInputElement).checked)
                "
              />
              {{ team.name }} <code>{{ team.slug }}</code>
            </label>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { teamKey, type GithubOrgsView, type GithubSelection } from '../../../../shared/github-orgs'
import type { IpcApi } from '../../../../shared/ipc-contract'

const emit = defineEmits<{
  /** The selection of orgs and teams changed. */
  change: []
}>()

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

const view = ref<GithubOrgsView | null>(null)
const loading = ref(false)
const errorMessage = ref('')

/**
 * Shows an answer of the main process.
 *
 * @param result - the answer.
 */
function show(result: Awaited<ReturnType<IpcApi['getGithubOrgs']>>): void {
  if (result.success) view.value = result.view
  else errorMessage.value = result.message
}

/** Inspects the account on GitHub. */
async function inspect(): Promise<void> {
  if (!api) return
  loading.value = true
  errorMessage.value = ''
  try {
    show(await api.inspectGithubOrgs())
  } catch {
    errorMessage.value = 'The organizations couldn’t be inspected.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!api) return
  try {
    show(await api.getGithubOrgs())
  } catch {
    errorMessage.value = 'The organizations couldn’t be read.'
  }
  // Nothing inspected yet: do it for the user.
  if (view.value && !view.value.inspection) await inspect()
})

/**
 * Tells whether GitHub hid an organization's teams for lack of SSO authorization.
 *
 * @param login - the organization.
 */
function isSsoHidden(login: string): boolean {
  return view.value?.inspection?.ssoRequired?.includes(login) ?? false
}

/**
 * Tells whether an organization is enabled.
 *
 * @param login - the organization.
 */
function orgEnabled(login: string): boolean {
  return !view.value!.selection.disabledOrgs.includes(login.toLowerCase())
}

/**
 * Tells whether a team is enabled (not counting its organization).
 *
 * @param org - the organization.
 * @param slug - the team.
 */
function teamEnabled(org: string, slug: string): boolean {
  return !view.value!.selection.disabledTeams.includes(teamKey(org, slug))
}

/**
 * Saves a new selection.
 *
 * @param selection - the selection.
 */
async function save(selection: GithubSelection): Promise<void> {
  view.value = { ...view.value!, selection }
  try {
    // Plain copies: reactive proxies can't cross the IPC boundary (they aren't structured-cloneable).
    const result = await api?.setGithubSelection({
      disabledOrgs: [...selection.disabledOrgs],
      disabledTeams: [...selection.disabledTeams]
    })
    if (result && !result.success) errorMessage.value = result.message
  } catch {
    errorMessage.value = 'The selection couldn’t be saved.'
  }
  emit('change')
}

/**
 * Returns a list with a value present or absent.
 *
 * @param list - the list.
 * @param value - the value.
 * @param present - whether the value is in the result.
 */
function withValue(list: string[], value: string, present: boolean): string[] {
  const rest = list.filter((item) => item !== value)
  return present ? [...rest, value] : rest
}

/**
 * Enables or disables an organization.
 *
 * @param login - the organization.
 * @param enabled - whether it is enabled.
 */
function toggleOrg(login: string, enabled: boolean): Promise<void> {
  const selection = view.value!.selection
  return save({
    ...selection,
    disabledOrgs: withValue(selection.disabledOrgs, login.toLowerCase(), !enabled)
  })
}

/**
 * Enables or disables a team.
 *
 * @param org - the organization.
 * @param slug - the team.
 * @param enabled - whether it is enabled.
 */
function toggleTeam(org: string, slug: string, enabled: boolean): Promise<void> {
  const selection = view.value!.selection
  return save({
    ...selection,
    disabledTeams: withValue(selection.disabledTeams, teamKey(org, slug), !enabled)
  })
}
</script>

<style src="./settings-form.css"></style>
<style scoped>
.github-orgs-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.org-list,
.team-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.org-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.org {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.org-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.org-no-teams {
  margin: 4px 0 0 24px;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 6px 0 0 24px;
}

.team {
  display: flex;
  align-items: center;
  gap: 6px;
}

.team--off {
  opacity: 0.5;
}

.team code {
  color: var(--color-text-muted);
}
</style>
