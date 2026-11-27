# Local usage

## Prerequisites

- Node.js 26.13.1 or later (`engines` in `package.json`) and [nvm](https://github.com/nvm-sh/nvm): the Makefile sources nvm and switches to that Node version before each command (`nvm install 26` once).
- [pnpm](https://pnpm.io/), pinned by `packageManager` in `package.json`. Don't commit a `package-lock.json` or `yarn.lock`.

## Commands

| Make target         | Script              | Purpose                                                                                                                                                     |
| ------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make install`      | `pnpm install`      | Install the dependencies and the Electron binary.                                                                                                           |
| `make run-dev`      | `pnpm dev`          | Development, hot-reloading renderer.                                                                                                                        |
| `make run`          | `pnpm start`        | Launch the built app.                                                                                                                                       |
| `make test`         | `pnpm test`         | Vitest: main, shared (node) and renderer (`happy-dom`) tests.                                                                                               |
| `make docs`         | `pnpm docs:dev`     | Serve the documentation site locally (VitePress, hot reload, `http://localhost:5173`).                                                                      |
| `make docs-build`   | `pnpm docs:build`   | Build the documentation site into `docs/.vitepress/dist`; a dead link fails it.                                                                             |
| `make docs-preview` | `pnpm docs:preview` | Build the site, then serve the built one.                                                                                                                   |
| `make lint`         | `pnpm lint`         | ESLint (`--fix`) then the Markdown lint.                                                                                                                    |
| `make typecheck`    | `pnpm typecheck`    | `tsc` on main/preload/shared, `vue-tsc` on the renderer.                                                                                                    |
| `make build`        | `pnpm build`        | Typecheck, bundle, package an unpacked Linux app (`dist/`).                                                                                                 |
| `make build-linux`  | `pnpm build:linux`  | Typecheck, bundle, package the Linux x64 AppImage (`dist/Grepo-<version>.AppImage`).                                                                        |
| `make build-win`    | `pnpm build:win`    | Typecheck, bundle, package the Windows x64 NSIS installer (`dist/Grepo-Setup-<version>.exe`) and portable executable (`dist/Grepo-<version>-portable.exe`). |
| `make run-build`    | `pnpm build:linux`  | `make build-linux`, then run the AppImage detached from the terminal.                                                                                       |
| `make shell`        |                     | Interactive shell with the right Node version.                                                                                                              |

## Notes

- `make build-win` builds the Windows installer and portable executable. The app has no native module, so nothing is rebuilt per platform. Build it **on Windows** (the CI uses a Windows runner): from Linux, electron-builder's NSIS target needs [Wine](https://www.winehq.org/) installed, and without it fails with `wine is required` (`ERR_ELECTRON_BUILDER_CANNOT_EXECUTE`). The first run downloads Electron's Windows build and the NSIS tools. The packaging config (`electron-builder.yml`) sets `win.signAndEditExecutable: false`, so the `.exe` itself keeps Electron's icon (the installer and shortcuts use the app's). Nothing is signed or published.

- `ELECTRON_RUN_AS_NODE`, set in some editors' terminals, makes Electron start as plain Node: the Makefile unsets it.
- The sandboxed preload script can't `require()` packages: `electron.vite.config.ts` bundles its dependencies (no `externalizeDepsPlugin()` for `preload`).
- Electron's own data (caches, local storage) lives in `~/.config/grepo`, the default configuration folder, next to the app's JSON files.
