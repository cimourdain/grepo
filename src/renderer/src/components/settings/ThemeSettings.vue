<!--
  The Theme tab of Settings: the included themes as a grid of boxes, each a preview painted with
  the theme's own colors (`ThemePreview`) over a radio button. Choosing one applies it at once
  and saves it.
-->
<template>
  <fieldset class="theme-settings">
    <legend>Theme</legend>
    <div class="theme-list" role="radiogroup" aria-label="Theme">
      <div
        v-for="theme in includedThemeChoices"
        :key="theme.key"
        class="theme-entry"
        :class="{ 'theme-entry--selected': selected === theme.key }"
      >
        <label class="theme-choice" :title="theme.description">
          <input
            type="radio"
            name="theme"
            :value="theme.key"
            :checked="selected === theme.key"
            @change="select(theme.key)"
          />
          <ThemePreview :variables="includedThemes[theme.key].values" />
          <span class="theme-name">{{ theme.name }}</span>
        </label>
      </div>
    </div>
    <p v-if="failed" class="theme-failure" role="alert">The theme couldn’t be saved.</p>
  </fieldset>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { DEFAULT_COLOR_THEME, type ColorTheme } from '../../../../shared/app-settings'
import type { IpcApi } from '../../../../shared/ipc-contract'
import { includedThemeChoices, includedThemes } from '../../../../shared/themes/included-themes'
import { applyTheme } from '../../themes/apply-theme'
import ThemePreview from '../ThemePreview.vue'

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

const selected = ref<ColorTheme>(DEFAULT_COLOR_THEME)
const failed = ref(false)

onMounted(async () => {
  if (!api) return
  try {
    selected.value = (await api.getSettings()).colorTheme
  } catch {
    failed.value = true
  }
})

/**
 * Applies a theme and saves it.
 *
 * @param theme - the chosen theme.
 */
async function select(theme: ColorTheme): Promise<void> {
  selected.value = theme
  applyTheme(theme)
  failed.value = false
  try {
    const result = await api?.setColorTheme(theme)
    if (result && !result.success) failed.value = true
  } catch {
    failed.value = true
  }
}
</script>

<style scoped>
.theme-settings {
  border: none;
  margin: 0;
  padding: 0;
}

.theme-settings legend {
  padding: 0;
  margin-bottom: 12px;
  font-size: 1.1em;
  font-weight: 600;
}

.theme-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.theme-entry {
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.theme-entry--selected {
  border-color: var(--color-accent);
  background: var(--color-accent-surface);
}

.theme-choice {
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
}

.theme-choice input {
  align-self: flex-start;
}

.theme-name {
  font-size: 0.9em;
}

.theme-failure {
  color: var(--color-danger);
}
</style>
