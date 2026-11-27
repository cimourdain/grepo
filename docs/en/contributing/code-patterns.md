# Code patterns

- TypeScript strict, ESLint (flat config) and Prettier (`singleQuote`, no semicolons, 100 columns): run `make lint`.
- Every module starts with a doc comment saying what it does, with an `@example` where useful; every function has a JSDoc with `@param`s. ESLint requires explicit return types.
- Vue 3 `<script setup lang="ts">`, scoped styles reading theme variables only. A component's top comment says what it shows and how it behaves.
- Logic lives in small pure modules (`src/shared`, `src/main/*`) with injected system dependencies, so it is unit-tested without Electron; components stay thin.
- The renderer reaches the main process only through `window.api` and `src/shared/ipc-contract.ts`. Validate every IPC argument in the handler.
- Never leave a failure silent: a failed call shows a readable message in the page.
