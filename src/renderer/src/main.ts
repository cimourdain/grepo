/**
 * Vue application entry point for the renderer process: restores the last theme before mounting,
 * so the first frame already shows it, mounts `App` with the router, then reads the saved theme.
 */
import './styles/global-reset.css'
import './styles/scrollbars.css'

import { createApp } from 'vue'

import App from './App.vue'
import { router } from './router'
import { applySavedTheme, restoreLastTheme } from './themes/apply-theme'

restoreLastTheme()
createApp(App).use(router).mount('#app')
void applySavedTheme()
