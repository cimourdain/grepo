// Build configuration for the Electron main, preload, and renderer bundles.
// electron-vite reads this file to produce three separate Vite builds (one
// per Electron process type) and to drive `electron-vite dev`/`build`.
import vue from '@vitejs/plugin-vue'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// The app's version, shown by the Settings footer.
const appVersion = (
  JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }
).version

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    // Not externalized: a sandboxed preload script cannot `require()` node_modules packages,
    // so its dependencies are bundled into its single output file.
    plugins: []
  },
  renderer: {
    define: { __APP_VERSION__: JSON.stringify(appVersion) },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
