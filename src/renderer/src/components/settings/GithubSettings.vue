<!--
  The Github tab of Settings: logs in to GitHub with a personal access token, to use the GitHub
  API. The token is checked against GitHub, and saved by the main process (encrypted with the
  system's keyring when there is one); it never comes back to the page, which only shows the
  account. Logging out forgets the token.
-->
<template>
  <section class="settings-tab">
    <h3>Github</h3>
    <template v-if="state.loggedIn">
      <p class="github-account" role="status">
        Logged in as <strong>{{ state.login }}</strong><template v-if="state.name">
          ({{ state.name }})</template
        >.
      </p>
      <p v-if="!state.encrypted" class="settings-message settings-message--warning">
        No system keyring is available: the token is saved in the configuration folder, readable by
        your user only.
      </p>
      <button type="button" class="settings-button" @click="logout">Log out</button>
      <GithubOrgsPanel />
      <GithubReposPanel />
    </template>
    <form v-else class="settings-tab" @submit.prevent="login">
      <p class="settings-hint">
        Create a personal access token on
        <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer"
          >github.com/settings/tokens</a
        >
        (the <code>repo</code> scope gives access to private repositories), then paste it here.
      </p>
      <label class="settings-field">
        <span>Personal access token</span>
        <input
          v-model="token"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="ghp_…"
          aria-label="Personal access token"
        />
      </label>
      <button
        type="submit"
        class="settings-button settings-button--primary"
        :disabled="token.trim() === '' || busy"
      >
        {{ busy ? 'Logging in…' : 'Log in' }}
      </button>
    </form>
    <p v-if="errorMessage" class="settings-message settings-message--error" role="alert">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import GithubOrgsPanel from './GithubOrgsPanel.vue'
import GithubReposPanel from './GithubReposPanel.vue'

import { LOGGED_OUT, type GithubLoginState } from '../../../../shared/github-auth'
import type { IpcApi } from '../../../../shared/ipc-contract'

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

const state = ref<GithubLoginState>({ ...LOGGED_OUT })
const token = ref('')
const busy = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  if (!api) return
  try {
    state.value = await api.getGithubLogin()
  } catch {
    errorMessage.value = 'The login state couldn’t be read.'
  }
})

/** Logs in with the token typed. */
async function login(): Promise<void> {
  if (!api) return
  busy.value = true
  errorMessage.value = ''
  try {
    const result = await api.loginToGithub(token.value)
    if (result.success) {
      state.value = result.state
      token.value = ''
    } else errorMessage.value = result.message
  } catch {
    errorMessage.value = 'The login failed.'
  } finally {
    busy.value = false
  }
}

/** Forgets the token. */
async function logout(): Promise<void> {
  if (!api) return
  errorMessage.value = ''
  try {
    await api.logoutFromGithub()
    state.value = { ...LOGGED_OUT }
  } catch {
    errorMessage.value = 'The logout failed.'
  }
}
</script>

<style src="./settings-form.css"></style>
