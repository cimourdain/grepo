/**
 * Registers the main process's IPC handlers: one per channel of `src/shared/ipc-contract.ts`.
 * Everything the renderer sends is untrusted and checked here: an action only runs on
 * repositories the last inspection found, and a theme must be an included one.
 *
 * @example
 * registerIpcHandlers(services)
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { BrowserWindow, dialog, ipcMain } from 'electron'

import { expandPath, isAbsolutePath, parseColorTheme } from '../../shared/app-settings'
import { enabledTeams } from '../../shared/github-orgs'
import { IpcChannel, type GeneralSettingsRequest } from '../../shared/ipc-contract'
import { parseRepositoryAction } from '../../shared/repository-actions'
import type { PresetConfiguration } from '../../shared/ipc-contract'
import type { PresetFilter } from '../../shared/repository-presets'
import type { ActionEnvironment } from '../actions/run-repository-action'
import { runRepositoryAction } from '../actions/run-repository-action'
import type { ConfigLocation } from '../config/config-location'
import type { SettingsStore } from '../config/settings-store'
import { GithubApi, GithubApiError } from '../github/github-api'
import { applyWindowControl, windowChromeOf } from '../window/window-controls'
import type { SettingsExchange } from '../settings-exchange/settings-exchange'
import {
  exportFileName,
  parseExportFile,
  summarize,
  type ExchangeData
} from '../../shared/settings-exchange'
import type { GithubRepositoriesStore } from '../github/github-repositories-store'
import type { GithubOrgsStore } from '../github/github-orgs-store'
import { inspectAccount, inspectRepositories, markLocal } from '../github/inspect-github'
import { cloneRepository, type GitRunner } from '../repositories/clone-repository'
import type { GithubAuthStore } from '../github/github-auth-store'
import type { PresetStore } from '../presets/preset-store'
import { decorateInventory } from '../repositories/decorate-repositories'
import type { ImageLoader } from '../repositories/image-loader'
import type { RepositoryStore } from '../repositories/repository-store'
import type { RulesStore } from '../repositories/rules-store'
import type { ViewsStore } from '../repositories/views-store'
import { scanRepositories } from '../repositories/scan-repositories'

/** What the handlers use. */
export interface Services {
  home: string
  location: ConfigLocation
  settings: SettingsStore
  repositories: RepositoryStore
  rules: RulesStore
  views: ViewsStore
  images: ImageLoader
  presets: PresetStore
  github: GithubAuthStore
  githubOrgs: GithubOrgsStore
  exchange: SettingsExchange
  githubRepositories: GithubRepositoriesStore
  githubFetch: typeof fetch
  runGit: GitRunner
  actionEnvironment: ActionEnvironment
}

/**
 * Registers the handlers.
 *
 * @param services - the stores and system pieces.
 */
export function registerIpcHandlers(services: Services): void {
  const { settings, repositories, presets, github, location, home, rules, images } = services
  /** The saved repositories with the clean names and tags the rules give. */
  const decorated = (): ReturnType<RepositoryStore['read']> =>
    decorateInventory(repositories.read(), rules.read(), images)

  ipcMain.handle(IpcChannel.GetWindowChrome, (event) =>
    windowChromeOf(
      process.platform,
      BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
    )
  )
  ipcMain.handle(IpcChannel.ApplyWindowControl, (event, control: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) applyWindowControl(window, control)
  })

  ipcMain.handle(IpcChannel.GetSettings, () => settings.view())

  ipcMain.handle(IpcChannel.SaveGeneralSettings, (_event, request: GeneralSettingsRequest) => {
    try {
      const paths = request?.localReposPaths
      if (paths !== undefined) {
        if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
          throw new Error('The settings were not understood.')
        }
        const cleaned = [...new Set(paths.map((path) => path.trim()).filter((path) => path !== ''))]
        if (cleaned.length === 0) throw new Error('Give at least one local repositories path.')
        const relative = cleaned.find((path) => !isAbsolutePath(expandPath(path, home)))
        if (relative) throw new Error(`“${relative}” is not an absolute path.`)
        settings.write({ localReposPaths: cleaned })
      }
      const configPath = request?.configPath
      if (configPath !== undefined) {
        if (typeof configPath !== 'string') throw new Error('The settings were not understood.')
        const typed = configPath.trim()
        // The settings above are copied with the other files if the folder changes.
        if (typed !== '' && expandPath(typed, home) !== location.current()) location.change(typed)
      }
      return { success: true }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle(IpcChannel.SetColorTheme, (_event, theme: unknown) => {
    const parsed = parseColorTheme(theme)
    if (!parsed) return { success: false, message: 'This theme does not exist.' }
    settings.write({ colorTheme: parsed })
    return { success: true }
  })

  ipcMain.handle(IpcChannel.GetRepositories, () => decorated())

  ipcMain.handle(IpcChannel.RefreshRepositories, () => {
    try {
      const inventory = scanRepositories(settings.expandedLocalReposPaths())
      repositories.write(inventory)
      return { success: true, inventory: decorated() }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle(IpcChannel.RunRepositoryAction, (_event, action: unknown, paths: unknown) => {
    const choice = parseRepositoryAction(action)
    if (!choice || !Array.isArray(paths)) return []
    const wanted = new Set(paths.filter((path): path is string => typeof path === 'string'))
    const known = repositories
      .read()
      .repositories.filter((repository) => wanted.has(repository.path))
    return runRepositoryAction(choice, known, services.actionEnvironment)
  })

  ipcMain.handle(IpcChannel.ListPresets, () => presets.list())
  ipcMain.handle(IpcChannel.SavePreset, (_event, name: string, filter: PresetFilter) =>
    presets.save(name, filter)
  )
  ipcMain.handle(IpcChannel.UpdatePreset, (_event, name: string, filter: PresetFilter) =>
    presets.update(name, filter)
  )
  ipcMain.handle(IpcChannel.DeletePreset, (_event, name: string) => presets.delete(name))
  ipcMain.handle(IpcChannel.ConfigurePreset, (_event, name: string, change: PresetConfiguration) =>
    presets.configure(name, change)
  )
  ipcMain.handle(IpcChannel.MovePreset, (_event, name: string, offset: number) =>
    presets.move(name, offset === -1 ? -1 : 1)
  )

  ipcMain.handle(IpcChannel.GetRepoRules, () => rules.read())
  ipcMain.handle(IpcChannel.SaveRepoRules, (_event, value: unknown) => rules.write(value))
  ipcMain.handle(IpcChannel.GetRepoViews, () => services.views.read())
  ipcMain.handle(IpcChannel.SaveRepoViews, (_event, value: unknown) => services.views.write(value))
  ipcMain.handle(IpcChannel.PickImage, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Choose an image',
      properties: ['openFile' as const],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
  ipcMain.handle(IpcChannel.LoadImage, (_event, path: unknown) =>
    typeof path === 'string' ? images.load(path) : null
  )

  ipcMain.handle(IpcChannel.GetGithubLogin, () => github.state())
  ipcMain.handle(IpcChannel.LoginToGithub, (_event, token: string) => github.login(token))
  ipcMain.handle(IpcChannel.LogoutFromGithub, () => {
    github.logout()
    services.githubOrgs.clear()
    services.githubRepositories.clear()
  })

  const githubApi = (): GithubApi => new GithubApi(() => github.token(), services.githubFetch)
  /**
   * Turns a failed GitHub call into the answer the page shows.
   *
   * @param error - what was thrown.
   */
  const failure = (error: unknown): { success: false; message: string } => ({
    success: false,
    message:
      error instanceof GithubApiError || error instanceof Error ? error.message : String(error)
  })

  ipcMain.handle(IpcChannel.ListMyPullRequests, async (_event, org: unknown, name: unknown) => {
    // The names go into a search query: only what GitHub allows in them.
    const valid = (part: unknown): part is string =>
      typeof part === 'string' && /^[A-Za-z0-9_.-]+$/.test(part)
    if (!valid(org) || !valid(name)) return failure(new Error('This repository name is not valid.'))
    const { loggedIn, login } = github.state()
    if (!loggedIn) return failure(new Error('You are not logged in to GitHub.'))
    try {
      return { success: true, pullRequests: await githubApi().myPullRequests(org, name, login) }
    } catch (error) {
      return failure(error)
    }
  })

  /** The checked import file waiting for `ApplyImport`. */
  let pendingImport: { path: string; data: ExchangeData } | null = null
  /** An import file is a few KB; this only refuses a wrong file. */
  const MAX_IMPORT_BYTES = 5_000_000

  ipcMain.handle(IpcChannel.ExportSettings, async (event, request: unknown) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      // The time of the export is in the file's name; the same time is the file's `exportedAt`.
      const exportTime = new Date()
      const options = {
        title: 'Export the settings',
        defaultPath: join(home, exportFileName(exportTime)),
        filters: [{ name: 'JSON', extensions: ['json'] }]
      }
      const chosen = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options)
      if (chosen.canceled || !chosen.filePath) return { status: 'cancelled' }
      // Local paths are included unless the page says `false`.
      const includeLocalPaths =
        (request as { includeLocalPaths?: unknown } | null)?.includeLocalPaths !== false
      const file = services.exchange.export(exportTime, includeLocalPaths)
      writeFileSync(chosen.filePath, `${JSON.stringify(file, null, 2)}\n`)
      return { status: 'done', path: chosen.filePath, summary: summarize(file) }
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) }
    }
  })
  ipcMain.handle(IpcChannel.PreviewImport, async (event) => {
    pendingImport = null
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      const options = {
        title: 'Import settings',
        properties: ['openFile' as const],
        filters: [{ name: 'JSON', extensions: ['json'] }]
      }
      const chosen = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options)
      const path = chosen.filePaths[0]
      if (chosen.canceled || !path) return { status: 'cancelled' }
      if (statSync(path).size > MAX_IMPORT_BYTES) {
        return { status: 'error', message: 'This file is too big to be a settings file.' }
      }
      let json: unknown
      try {
        json = JSON.parse(readFileSync(path, 'utf8'))
      } catch {
        return { status: 'error', message: 'This file is not valid JSON.' }
      }
      const parsed = parseExportFile(json, home)
      if (!parsed.success) return { status: 'error', message: parsed.message }
      pendingImport = { path, data: parsed.data }
      return { status: 'ready', path, summary: summarize(parsed.data) }
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) }
    }
  })
  ipcMain.handle(IpcChannel.ApplyImport, () => {
    if (!pendingImport) return { status: 'error', message: 'Choose a settings file first.' }
    const { path, data } = pendingImport
    pendingImport = null
    try {
      services.exchange.apply(data)
      return { status: 'done', path, summary: summarize(data) }
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle(IpcChannel.GetGithubOrgs, () => ({
    success: true,
    view: services.githubOrgs.read()
  }))
  ipcMain.handle(IpcChannel.InspectGithubOrgs, async () => {
    try {
      const view = services.githubOrgs.saveInspection(await inspectAccount(githubApi()))
      return { success: true, view }
    } catch (error) {
      return failure(error)
    }
  })
  ipcMain.handle(IpcChannel.SetGithubSelection, (_event, selection: unknown) => {
    services.githubOrgs.saveSelection(selection)
    return { success: true }
  })
  ipcMain.handle(IpcChannel.GetGithubRepositories, () => {
    const saved = services.githubRepositories.read()
    return {
      success: true,
      // The local repositories may have changed since the inspection.
      repositories: markLocal(saved.repositories, repositories.read().repositories),
      inspectedAt: saved.inspectedAt
    }
  })
  ipcMain.handle(IpcChannel.InspectGithubRepositories, async () => {
    try {
      const view = services.githubOrgs.read()
      if (!view.inspection) return failure(new Error('Inspect the organizations and teams first.'))
      const teams = enabledTeams(view.inspection, view.selection)
      if (teams.length === 0) return failure(new Error('No team is enabled.'))
      // The local repositories are read again, so a repository cloned meanwhile shows as cloned.
      try {
        repositories.write(scanRepositories(settings.expandedLocalReposPaths()))
      } catch {
        // The last inspection's repositories are used.
      }
      const found = await inspectRepositories(githubApi(), teams, repositories.read().repositories)
      const saved = { repositories: found, inspectedAt: new Date().toISOString() }
      services.githubRepositories.write(saved)
      return { success: true, ...saved }
    } catch (error) {
      return failure(error)
    }
  })
  ipcMain.handle(
    IpcChannel.CloneGithubRepository,
    async (_event, org: unknown, name: unknown, targetPath: unknown) => {
      const typed = typeof targetPath === 'string' ? targetPath.trim() : ''
      const folder = expandPath(typed === '' ? settings.read().localReposPaths[0]! : typed, home)
      const result = await cloneRepository(String(org), String(name), folder, services.runGit)
      if (result.success) {
        try {
          repositories.write(scanRepositories(settings.expandedLocalReposPaths()))
        } catch {
          // The next inspection will find it.
        }
        // Remembered even when the folder is outside the local repositories paths.
        const saved = services.githubRepositories.read()
        const full = `${String(org)}/${String(name)}`.toLowerCase()
        services.githubRepositories.write({
          ...saved,
          repositories: saved.repositories.map((repository) =>
            repository.fullName.toLowerCase() === full
              ? { ...repository, status: 'cloned', localPath: result.path }
              : repository
          )
        })
      }
      return result
    }
  )
}
