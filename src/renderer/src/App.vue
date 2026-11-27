<!--
  Root component of the renderer process: the title bar the app draws (`AppTitleBar`), then the
  persistent sidebar alongside the routed page. The content area scrolls, with a scrollbar in the
  theme's colors (`styles/scrollbars.css`).
-->
<template>
  <div class="app-window">
    <AppTitleBar />
    <div class="app-shell">
      <AppSidebar />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import AppSidebar from './components/AppSidebar.vue'
import AppTitleBar from './components/AppTitleBar.vue'
import { loadPresets } from './presets/preset-client'

// The sidebar lists the presets.
onMounted(loadPresets)
</script>

<style scoped>
.app-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  background: var(--color-background);
  color: var(--color-text);
}

.app-shell {
  display: flex;
  flex: 1;
  min-height: 0;
}

.app-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
