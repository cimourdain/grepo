# Architecture

```text
src/
  shared/     types and pure helpers used by both processes
  main/       Electron main process: window, stores, IPC handlers, repository actions
  preload/    contextBridge exposing the typed `window.api`
  renderer/   Vue 3 app: router, pages, components, theme application
```

## Rules

- The renderer has no Node access. Every call goes `window.api` → `ipcRenderer.invoke` → `ipcMain.handle`, typed by `src/shared/ipc-contract.ts` (the single list of channels and the `IpcApi` type).
- Everything the renderer sends is untrusted and validated in `src/main/ipc/register.ts`: an action only runs on repositories the last inspection saved (matched by path), a theme must be an included one.
- External links open only when `https:` without credentials (`main/window/external-links.ts`).

## Main process

| Module                                                  | Role                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/config-location.ts`                             | Where the configuration folder is (default `~/.config/grepo`); a custom choice lives in `location.json` of the default one.                                                                                                                                   |
| `config/settings-store.ts`                              | `settings.json`: color theme, local repositories paths (a former single `localReposPath` is read as one).                                                                                                                                                     |
| `repositories/scan-repositories.ts`                     | Finds repositories (a `.git` entry) up to `MAX_DEPTH` levels; reads the `origin` remote and `.circleci/`.                                                                                                                                                     |
| `repositories/repository-store.ts`                      | `repositories.json`: the last inspection.                                                                                                                                                                                                                     |
| `repositories/rules-store.ts`                           | `repo-rules.json`: the naming and tag rules of Settings → Repos (validated on save).                                                                                                                                                                          |
| `repositories/decorate-repositories.ts`                 | Gives each repository its clean name (`cleanParts`, `cleanName`) and `tags` from the rules, on every read, not at inspection.                                                                                                                                 |
| `repositories/image-loader.ts`                          | Reads the rules' image files as data URLs (the CSP only allows `data:` images), cached by modification time.                                                                                                                                                  |
| `repositories/views-store.ts`                           | `repo-views.json`: the view configurations and the default one (`shared/repo-views.ts` holds the types, clamping and validation).                                                                                                                             |
| `presets/preset-store.ts`                               | `presets.json`: saved page states (search, org and tag filters, view id, shown attributes), in the sidebar's order.                                                                                                                                           |
| `actions/run-repository-action.ts`                      | Github / Circleci / VSCode / All, with the system calls injected.                                                                                                                                                                                             |
| `actions/vscode-workspace.ts`                           | Builds and writes the temporary `.code-workspace` file with random title bar colors.                                                                                                                                                                          |
| `settings-exchange/settings-exchange.ts`                | Reads the exported settings (paths, rules, View settings) from the stores and writes an imported file into them; `shared/settings-exchange.ts` holds the file format and its checks (a file is accepted whole or refused).                                    |
| `desktop/app-icon.ts`, `desktop/desktop-integration.ts` | The icon (read from `resources/app-icon.png`, resized to 128 px for a window: Linux gives a window of 256 px or more none), the tray icon with its menu (Open Grepo, Quit), and on Linux the desktop entry.                                                   |
| `desktop/linux-desktop-entry.ts`                        | Writes `~/.local/share/applications/grepo.desktop` and the icon at each start (an AppImage installs none), with `StartupWMClass=grepo`, the window class, so docks and taskbars show the app's icon and name. A run from the sources is hidden from the menu. |
| `window/window-controls.ts`                             | The minimize, maximize and close actions of the title bar the app draws (`AppTitleBar.vue`: icon, name, buttons), as desktops such as GNOME show no icon in their own. macOS keeps its buttons.                                                               |
| `github/github-api.ts`                                  | The GitHub REST calls (orgs, teams, a team's repositories, CODEOWNERS, the user's open pull requests in a repository) with the saved token; network injected.                                                                                                 |
| `github/inspect-github.ts`                              | The account inspection, and the repositories of enabled teams whose CODEOWNERS names one (cloned or missing).                                                                                                                                                 |
| `github/github-repositories-store.ts`                   | `github-repositories.json`: the last repositories inspection, shown again without asking GitHub; cleared on logout.                                                                                                                                           |
| `github/github-orgs-store.ts`                           | `github-orgs.json`: the last account inspection and what the user disabled; cleared on logout.                                                                                                                                                                |
| `repositories/clone-repository.ts`                      | `git clone` over SSH, with a checked `org`/`name` (the page never sends a URL) and git injected.                                                                                                                                                              |
| `github/github-auth-store.ts`                           | Token login checked on `GET /user`, encrypted with `safeStorage`; the token never reaches the renderer.                                                                                                                                                       |

`src/shared/repo-rules.ts` holds the pure rule logic (`applyNamingRules`, `tagsOf`, validation), also used by the Settings page's live preview. `repositories.json` holds the raw inspection; names and tags are derived.

Stores are plain JSON files written atomically (`config/json-file.ts`), and read the configuration folder on each call, so changing it takes effect without a restart.

## Renderer

- `pages/ReposPage.vue`, `pages/SettingsPage.vue` (tabs General, Github, Rules, View, Theme, Import/Export in `components/settings/`). Every Settings form saves by itself through `settings/use-auto-save.ts`: a debounced, validated save of a plain copy, with no Save button.
- `presets/preset-client.ts`: the shared reactive preset list that the sidebar, Repos and Settings → View follow.
- `themes/apply-theme.ts`: see [Theme](./theme.md).
