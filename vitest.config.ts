/**
 * Vitest configuration, kept apart from `electron.vite.config.ts` so the runner can compile
 * Vue SFCs and resolve the `@renderer` alias. Renderer tests run under `happy-dom`;
 * main-process and shared tests run under `node`.
 */
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const appVersion = (
  JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }
).version

export default defineConfig({
  plugins: [vue()],
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  test: {
    environment: 'happy-dom',
    environmentMatchGlobs: [
      ['src/main/**', 'node'],
      ['src/shared/**', 'node']
    ]
  }
})
