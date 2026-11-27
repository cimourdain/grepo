/**
 * ESLint configuration (flat format) — see docs/en/contributing/code-patterns.md for the
 * project's coding-style rules this enforces. It lints the `.js`, `.cjs`, `.mjs`, `.ts` and `.vue`
 * files with the Vue 3 recommended rules and the Electron toolkit's TypeScript preset, Prettier's
 * rule switch-offs last. `__APP_VERSION__` is defined by the builds (`electron.vite.config.ts`).
 */
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/out', '**/dist', '**/.vitepress/cache'] },
  tseslint.configs.recommended,
  eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parser: tseslint.parser,
        extraFileExtensions: ['.vue']
      },
      globals: { __APP_VERSION__: 'readonly' }
    }
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,vue}'],
    languageOptions: { globals: { __APP_VERSION__: 'readonly' } }
  },
  eslintConfigPrettier
)
