<!--
  Persistent sidebar, rendered once by `App.vue`: the Repos entry (book icon), with the presets
  whose sidebar setting is on listed under it (each opening Repos on that preset), and, at the
  bottom, the Settings entry (gear icon) and, after it, the About entry (info icon). The current page's entry has the active background
  (`--color-nav-active`).
-->
<template>
  <nav class="sidebar" aria-label="Main">
    <div class="sidebar-top">
      <RouterLink to="/repos" class="sidebar-link" :class="{ 'sidebar-link--active': reposActive }">
        <!-- eslint-disable-next-line vue/no-v-html -- static, developer-authored icon markup -->
        <span class="sidebar-icon" v-html="icons.book"></span>
        <span class="sidebar-label">Repos</span>
      </RouterLink>
      <div v-if="sidebarPresets.length > 0" class="sidebar-children">
        <RouterLink
          v-for="preset in sidebarPresets"
          :key="preset.name"
          :to="presetRoute(preset.name)"
          class="sidebar-link sidebar-child"
          :class="{ 'sidebar-link--active': activePreset === preset.name }"
        >
          <span class="sidebar-label">{{ presetSidebarLabel(preset) }}</span>
        </RouterLink>
      </div>
    </div>
    <div class="sidebar-bottom">
      <RouterLink
        to="/settings"
        class="sidebar-link"
        :class="{ 'sidebar-link--active': route.name === 'settings' }"
        aria-label="Settings"
        title="Settings"
      >
        <!-- eslint-disable-next-line vue/no-v-html -- static, developer-authored icon markup -->
        <span class="sidebar-icon" v-html="icons.settings"></span>
        <span class="sidebar-label">Settings</span>
      </RouterLink>
      <RouterLink
        to="/about"
        class="sidebar-link"
        :class="{ 'sidebar-link--active': route.name === 'about' }"
        aria-label="About"
        title="About"
      >
        <!-- eslint-disable-next-line vue/no-v-html -- static, developer-authored icon markup -->
        <span class="sidebar-icon" v-html="icons.about"></span>
        <span class="sidebar-label">About</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { presetRoute, presetSidebarLabel } from '../../../shared/repository-presets'
import { sidebarPresets } from '../presets/preset-client'
import { icons } from './icons'

const route = useRoute()

/** The preset the Repos page is open on, `null` elsewhere. */
const activePreset = computed(() =>
  route.name === 'repos-preset' ? String(route.params.presetName) : null
)

/** Whether Repos itself (not one of its presets) is the current page. */
const reposActive = computed(() => route.name === 'repos')
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  width: 200px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 12px 8px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  text-decoration: none;
}

.sidebar-link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.sidebar-link--active,
.sidebar-link--active:hover {
  background: var(--color-nav-active);
  color: var(--color-on-nav-active);
}

.sidebar-icon {
  display: inline-flex;
}

.sidebar-children {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 18px;
  padding-left: 8px;
  border-left: 1px solid var(--color-border);
}

.sidebar-child {
  padding: 5px 10px;
  font-size: 0.9em;
}

.sidebar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
