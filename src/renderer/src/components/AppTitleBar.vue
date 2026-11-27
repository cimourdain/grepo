<!--
  The title bar the app draws: its icon and name, then its minimize, maximize (or restore) and
  close buttons, as desktops such as GNOME show no icon in theirs. The bar moves the window; the
  buttons follow the theme. macOS keeps its own buttons over the bar's left, so the bar makes room
  for them and draws none (`getWindowChrome`). Outside the desktop app (no `window.api`), there is
  no window to control, so nothing shows.

  Usage:
    <AppTitleBar />
-->
<template>
  <header
    v-if="api"
    class="app-title-bar"
    :class="{ 'app-title-bar--inset': chrome && !chrome.drawsControls }"
  >
    <img :src="appIcon" alt="" class="app-title-bar-icon" />
    <span class="app-title-bar-name">Grepo</span>
    <div v-if="chrome?.drawsControls" class="app-title-bar-controls">
      <button
        type="button"
        class="app-title-bar-button app-title-bar-minimize"
        aria-label="Minimize"
        title="Minimize"
        @click="apply('minimize')"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 9.5h8" /></svg>
      </button>
      <button
        type="button"
        class="app-title-bar-button app-title-bar-maximize"
        :aria-label="chrome.maximized ? 'Restore' : 'Maximize'"
        :title="chrome.maximized ? 'Restore' : 'Maximize'"
        @click="apply('toggle-maximize')"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <template v-if="chrome.maximized">
            <path d="M2 4.5h5.5V10H2z" />
            <path d="M4.5 4.5V2H10v5.5H7.5" />
          </template>
          <path v-else d="M2.5 2.5h7v7h-7z" />
        </svg>
      </button>
      <button
        type="button"
        class="app-title-bar-button app-title-bar-close"
        aria-label="Close"
        title="Close"
        @click="apply('close')"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import appIcon from '../../../../resources/app-icon.svg'
import type { IpcApi, WindowChrome, WindowControl } from '../../../shared/ipc-contract'

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

/** What the bar draws, `null` until read. */
const chrome = ref<WindowChrome | null>(null)

/**
 * Asks for a window action.
 *
 * @param control - the action.
 */
function apply(control: WindowControl): void {
  void api?.applyWindowControl(control)
}

let stopFollowing: (() => void) | undefined

onMounted(async () => {
  try {
    stopFollowing = api?.onWindowMaximizedChanged?.((maximized) => {
      if (chrome.value) chrome.value = { ...chrome.value, maximized }
    })
    chrome.value = (await api?.getWindowChrome?.()) ?? null
  } catch {
    // The bar stays without buttons; the system's own shortcuts still work.
  }
})

onUnmounted(() => stopFollowing?.())
</script>

<style scoped>
.app-title-bar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding-left: 12px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  /* Moves the window, on every system. */
  -webkit-app-region: drag;
}

/* macOS's own buttons sit there. */
.app-title-bar--inset {
  padding-left: 80px;
}

.app-title-bar-icon {
  width: 20px;
  height: 20px;
}

.app-title-bar-controls {
  display: flex;
  align-self: stretch;
  margin-left: auto;
  -webkit-app-region: no-drag;
}

.app-title-bar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.app-title-bar-button svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
}

.app-title-bar-button:hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.app-title-bar-close:hover {
  background: var(--color-danger-strong);
  color: var(--color-on-solid);
}
</style>
