/**
 * The contract between the main process and the renderer: one channel name per call, and the
 * typed `IpcApi` the preload script exposes as `window.api`. It is the single source of truth
 * for both sides.
 */
import type { AppSettingsView, ColorTheme } from './app-settings'
import type {
  CloneResult,
  PullRequestsResult,
  GithubOrgsResult,
  GithubRepositoriesResult,
  GithubSelection
} from './github-orgs'
import type { GithubLoginResult, GithubLoginState } from './github-auth'
import type { RepositoryActionChoice, RepositoryActionOutcome } from './repository-actions'
import type { PresetFilter, RepositoryPreset } from './repository-presets'
import type { ExchangeSummary } from './settings-exchange'
import type { RepoViews } from './repo-views'
import type { RepoRules } from './repo-rules'
import type { RepositoryInventory } from './repository'

/** The invoke channels. */
export const IpcChannel = {
  GetSettings: 'settings:get',
  SaveGeneralSettings: 'settings:save-general',
  SetColorTheme: 'settings:set-color-theme',
  GetRepositories: 'repositories:get',
  RefreshRepositories: 'repositories:refresh',
  RunRepositoryAction: 'repositories:run-action',
  ListPresets: 'presets:list',
  SavePreset: 'presets:save',
  UpdatePreset: 'presets:update',
  DeletePreset: 'presets:delete',
  ConfigurePreset: 'presets:configure',
  MovePreset: 'presets:move',
  GetRepoRules: 'rules:get',
  SaveRepoRules: 'rules:save',
  GetRepoViews: 'views:get',
  SaveRepoViews: 'views:save',
  PickImage: 'rules:pick-image',
  LoadImage: 'rules:load-image',
  GetWindowChrome: 'window:get-chrome',
  ApplyWindowControl: 'window:apply-control',
  ExportSettings: 'exchange:export',
  PreviewImport: 'exchange:preview-import',
  ApplyImport: 'exchange:apply-import',
  GetGithubOrgs: 'github:get-orgs',
  InspectGithubOrgs: 'github:inspect-orgs',
  SetGithubSelection: 'github:set-selection',
  GetGithubRepositories: 'github:get-repositories',
  InspectGithubRepositories: 'github:inspect-repositories',
  CloneGithubRepository: 'github:clone',
  ListMyPullRequests: 'github:my-pull-requests',
  GetGithubLogin: 'github:get-login',
  LoginToGithub: 'github:login',
  LogoutFromGithub: 'github:logout'
} as const

/** The events the main process pushes to the page. */
export const IpcEvent = {
  WindowMaximizedChanged: 'window:maximized-changed'
} as const

/** An action of the window's title bar. */
export type WindowControl = 'minimize' | 'toggle-maximize' | 'close'

/** What the title bar the app draws shows. */
export interface WindowChrome {
  /** Whether it draws the minimize, maximize and close buttons (macOS keeps its own). */
  drawsControls: boolean
  maximized: boolean
}

/** What an export includes. */
export interface ExportOptions {
  /**
   * Whether it includes the settings that depend on this computer's local paths: the local
   * repositories paths and the tag rules tested on the local path (default: yes).
   */
  includeLocalPaths: boolean
}

/** The answer of an export or import step. */
export type ExchangeResult =
  /** The file was written, or the import applied. */
  | { status: 'done'; path: string; summary: ExchangeSummary }
  /** The import file was read and is valid; `applyImport` applies it. */
  | { status: 'ready'; path: string; summary: ExchangeSummary }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

/** What a call that can be refused answers. */
export type Outcome = { success: true } | { success: false; message: string }

/** The general settings the page saves. */
export interface GeneralSettingsRequest {
  /** The new local configuration folder; absent: unchanged. */
  configPath?: string
  /** The new local repositories paths; absent: unchanged. */
  localReposPaths?: string[]
}

/** What a preset's sidebar line can be changed to. */
export interface PresetConfiguration {
  sidebarEnabled?: boolean
  sidebarName?: string
}

/** The API the preload script exposes as `window.api`. */
export interface IpcApi {
  getSettings: () => Promise<AppSettingsView>
  saveGeneralSettings: (request: GeneralSettingsRequest) => Promise<Outcome>
  setColorTheme: (theme: ColorTheme) => Promise<Outcome>
  /** Reads the repositories saved by the last inspection. */
  getRepositories: () => Promise<RepositoryInventory>
  /** Inspects the local repositories folder and saves what it finds. */
  refreshRepositories: () => Promise<
    { success: true; inventory: RepositoryInventory } | { success: false; message: string }
  >
  /** Runs an action on repositories, given by their paths. */
  runRepositoryAction: (
    action: RepositoryActionChoice,
    paths: string[]
  ) => Promise<RepositoryActionOutcome[]>
  listPresets: () => Promise<RepositoryPreset[]>
  /** Saves a search and tag filter as a new preset (an existing name is overwritten). */
  savePreset: (name: string, filter: PresetFilter) => Promise<Outcome>
  /** Replaces the search and tag filter of an existing preset. */
  updatePreset: (name: string, filter: PresetFilter) => Promise<Outcome>
  deletePreset: (name: string) => Promise<Outcome>
  configurePreset: (name: string, change: PresetConfiguration) => Promise<Outcome>
  movePreset: (name: string, offset: -1 | 1) => Promise<Outcome>
  /** Reads the naming and tag rules of Settings → Repos. */
  getRepoRules: () => Promise<RepoRules>
  /** Saves the rules; the repositories then read with the new names and tags. */
  saveRepoRules: (rules: RepoRules) => Promise<Outcome>
  /** Reads the views of Settings → Repos → Views. */
  getRepoViews: () => Promise<RepoViews>
  saveRepoViews: (views: RepoViews) => Promise<Outcome>
  /** Opens a file dialog to choose an image; `null` when cancelled. */
  pickImage: () => Promise<string | null>
  /** Reads an image file as a data URL, `null` when it can't be shown. */
  loadImage: (path: string) => Promise<string | null>
  getWindowChrome: () => Promise<WindowChrome>
  applyWindowControl: (control: WindowControl) => Promise<void>
  /** Follows the window being maximized or restored; returns what stops following. */
  onWindowMaximizedChanged: (listener: (maximized: boolean) => void) => () => void
  /** Asks where to save, then writes the settings file (local repositories paths, rules, View settings). */
  exportSettings: (options: ExportOptions) => Promise<ExchangeResult>
  /** Asks for a settings file and checks it; nothing is changed until `applyImport`. */
  previewImport: () => Promise<ExchangeResult>
  /** Applies the file `previewImport` checked, replacing the current settings. */
  applyImport: () => Promise<ExchangeResult>
  /** The last inspection of the account's orgs and teams, and what is enabled; no network. */
  getGithubOrgs: () => Promise<GithubOrgsResult>
  /** Reads the account's orgs and teams from GitHub and saves them. */
  inspectGithubOrgs: () => Promise<GithubOrgsResult>
  setGithubSelection: (selection: GithubSelection) => Promise<Outcome>
  /** The saved result of the last repositories inspection, brought up to date with the local repositories; no network. */
  getGithubRepositories: () => Promise<GithubRepositoriesResult>
  /** Lists the repositories an enabled team is a code owner of, cloned or missing. */
  inspectGithubRepositories: () => Promise<GithubRepositoriesResult>
  /** Clones a repository into `targetPath` (empty: the local repositories path). */
  cloneGithubRepository: (org: string, name: string, targetPath: string) => Promise<CloneResult>
  /** The open pull requests the logged-in user created in a GitHub repository. */
  listMyPullRequests: (org: string, name: string) => Promise<PullRequestsResult>
  getGithubLogin: () => Promise<GithubLoginState>
  loginToGithub: (token: string) => Promise<GithubLoginResult>
  logoutFromGithub: () => Promise<void>
}
