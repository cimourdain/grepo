/**
 * Electron main-process entry point: creates the window (locked down: context isolation, no Node
 * integration, sandboxed renderer), wires the stores and the IPC handlers, and opens only
 * `https:` links outside the app.
 */
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { spawn } from 'node:child_process'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow, safeStorage, shell, type Tray } from 'electron'

import { APP_BACKGROUND_COLOR } from '../shared/app-theme'
import { IpcEvent } from '../shared/ipc-contract'
import { loadWindowIcon } from './desktop/app-icon'
import { createTray, installDesktopIntegration } from './desktop/desktop-integration'
import { ConfigLocation, LEGACY_APP_NAME, migrateLegacyConfig } from './config/config-location'
import { SettingsStore } from './config/settings-store'
import { GithubRepositoriesStore } from './github/github-repositories-store'
import { SettingsExchange } from './settings-exchange/settings-exchange'
import { GithubOrgsStore } from './github/github-orgs-store'
import { runGit } from './repositories/clone-repository'
import { GithubAuthStore } from './github/github-auth-store'
import { registerIpcHandlers } from './ipc/register'
import { PresetStore } from './presets/preset-store'
import { ImageLoader } from './repositories/image-loader'
import { RepositoryStore } from './repositories/repository-store'
import { RulesStore } from './repositories/rules-store'
import { ViewsStore } from './repositories/views-store'
import { isExternalLinkAllowed } from './window/external-links'

/**
 * Opens a workspace file in VS Code, through its `code` command.
 *
 * @param workspaceFile - the file's path.
 * @throws when `code` is not installed or can't start.
 */
function openInVsCode(workspaceFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('code', [workspaceFile], { detached: true, stdio: 'ignore' })
    child.once('error', (error) =>
      reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? new Error('The `code` command was not found: install VS Code or add it to the PATH.')
          : error
      )
    )
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

/** The tray icon, kept so that it isn't garbage-collected. */
let tray: Tray | null = null

/** Shows the main window: brings the open one forward, or creates it. */
function showWindow(): void {
  const [window] = BrowserWindow.getAllWindows()
  if (!window) return createWindow()
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

/** Creates the main window. */
function createWindow(): void {
  const window = new BrowserWindow({
    title: 'Grepo',
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: APP_BACKGROUND_COLOR,
    // The title bar is drawn by the app (`AppTitleBar.vue`), with its icon and the window's
    // buttons: desktops such as GNOME show no icon in theirs. macOS keeps its own buttons.
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' as const } : { frame: false }),
    // The window's icon (the taskbar's), at a size every system accepts.
    icon: loadWindowIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  window.on('ready-to-show', () => window.show())
  // The title bar's maximize button follows the window, however it is maximized.
  const sendMaximized = (maximized: boolean): void => {
    if (!window.isDestroyed()) window.webContents.send(IpcEvent.WindowMaximizedChanged, maximized)
  }
  window.on('maximize', () => sendMaximized(true))
  window.on('unmaximize', () => sendMaximized(false))
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalLinkAllowed(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // The window itself never navigates away from the app.
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })
  if (process.env.ELECTRON_RENDERER_URL && !app.isPackaged) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// The app's data folder is `~/.config/grepo`, the default configuration folder.
app.setName('grepo')

void app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.grepo.app')
  app.on('browser-window-created', (_event, window) => optimizer.watchWindowShortcuts(window))

  const home = homedir()
  const appData = app.getPath('appData')
  const configDir = join(appData, 'grepo')
  // The app was renamed: bring the configuration of its former name along, once.
  migrateLegacyConfig(join(appData, LEGACY_APP_NAME), configDir)
  const location = new ConfigLocation(home, configDir)
  const settings = new SettingsStore(location, home)
  const rules = new RulesStore(location)
  const views = new ViewsStore(location)
  const presets = new PresetStore(location)
  registerIpcHandlers({
    home,
    location,
    settings,
    repositories: new RepositoryStore(location),
    rules,
    githubOrgs: new GithubOrgsStore(location),
    githubRepositories: new GithubRepositoriesStore(location),
    githubFetch: (input, init) => fetch(input, init),
    runGit,
    views,
    images: new ImageLoader(home),
    presets,
    exchange: new SettingsExchange({ settings, rules, views, presets }),
    github: new GithubAuthStore(location, {
      // The asynchronous API: the synchronous one is deprecated.
      isEncryptionAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
      encrypt: (text) => safeStorage.encryptStringAsync(text),
      decrypt: (data) => safeStorage.decryptStringAsync(data),
      fetch: (input, init) => fetch(input, init)
    }),
    actionEnvironment: {
      openUrl: (url) => shell.openExternal(url),
      openWorkspace: openInVsCode,
      workspaceDirectory: join(tmpdir(), 'grepo', 'workspaces')
    }
  })
  installDesktopIntegration()
  tray = createTray({ onOpen: showWindow, onQuit: () => app.quit() })
  app.on('before-quit', () => tray?.destroy())
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
