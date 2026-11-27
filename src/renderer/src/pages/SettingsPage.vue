<!--
  The Settings page, in tabs (`PageTabs`):
  - General: the local configuration path, the local repositories path, and the Refresh section
    inspecting the local repositories folder;
  - Github: the login to GitHub, to use its API (second tab);
  - Rules: the naming rules (the repository name displayed in the Repos page), the tags rules and
    the tag colors;
  - View: the view styling configurations of the Repos page (font size, item width) and the
    Repos presets (the sidebar's lines);
  - Theme: the color theme;
  - Import/Export (last tab): export the local repositories paths, the rules and the View
    settings to a JSON file, and import such a file.
  Every form saves by itself once valid: there is no Save button.
  `/settings/<tab>` opens a tab, and the tab shown is kept in the address.
-->
<template>
  <section class="settings-page">
    <h2>Settings</h2>
    <PageTabs ref="tabs" :tabs="settingsTabs" @selected="onSelected">
      <template #general><GeneralSettings :key="generation" /></template>
      <template #github><GithubSettings /></template>
      <template #rules><RulesSettings :key="generation" /></template>
      <template #view>
        <ViewsSettings :key="generation" />
        <ViewSettings :key="generation" />
      </template>
      <template #theme><ThemeSettings /></template>
      <template #import-export>
        <ImportExportSettings @imported="generation++" />
      </template>
    </PageTabs>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PageTabs from '../components/PageTabs.vue'
import GeneralSettings from '../components/settings/GeneralSettings.vue'
import GithubSettings from '../components/settings/GithubSettings.vue'
import ImportExportSettings from '../components/settings/ImportExportSettings.vue'
import RulesSettings from '../components/settings/RulesSettings.vue'
import ThemeSettings from '../components/settings/ThemeSettings.vue'
import ViewsSettings from '../components/settings/ViewsSettings.vue'
import ViewSettings from '../components/settings/ViewSettings.vue'

const settingsTabs = [
  { key: 'general', label: 'General' },
  { key: 'github', label: 'Github' },
  { key: 'rules', label: 'Rules' },
  { key: 'view', label: 'View' },
  { key: 'theme', label: 'Theme' },
  { key: 'import-export', label: 'Import/Export' }
] as const

/** Raised by an import: the tabs read their settings again. */
const generation = ref(0)
const route = useRoute()
const router = useRouter()
const tabs = ref<InstanceType<typeof PageTabs> | null>(null)

/** Shows the tab the address names. */
function showRouteTab(): void {
  const key = String(route.params.tab ?? '')
  if (settingsTabs.some((tab) => tab.key === key)) tabs.value?.select(key)
}

/**
 * Keeps the shown tab in the address.
 *
 * @param key - the tab shown.
 */
function onSelected(key: string): void {
  if (route.params.tab !== key) void router.replace(`/settings/${key}`)
}

onMounted(showRouteTab)
watch(() => route.params.tab, showRouteTab)
</script>

<style scoped>
.settings-page {
  padding: 20px 24px;
}

.settings-page h2 {
  margin-top: 0;
}
</style>
