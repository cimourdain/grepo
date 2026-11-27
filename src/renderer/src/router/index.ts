/**
 * Renderer router: Repos (`/repos`, or opened on a saved preset at `/repos/preset/:presetName`)
 * Settings (`/settings`, a tab of it at `/settings/:tab`) and About (`/about`).
 */
import { createRouter, createWebHashHistory } from 'vue-router'

import ReposPage from '../pages/ReposPage.vue'
import AboutPage from '../pages/AboutPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'

export const router = createRouter({
  // Hash history avoids needing an HTTP server for `file://`-loaded production builds.
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/repos' },
    { path: '/repos', name: 'repos', component: ReposPage },
    { path: '/repos/preset/:presetName', name: 'repos-preset', component: ReposPage },
    { path: '/settings/:tab?', name: 'settings', component: SettingsPage },
    { path: '/about', name: 'about', component: AboutPage }
  ]
})
