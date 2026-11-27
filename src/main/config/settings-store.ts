/**
 * Reads and writes the application's settings (`settings.json` in the configuration folder).
 *
 * @example
 * const store = new SettingsStore(location, '/home/me')
 * store.view().localReposPaths // ['/home/me/code']
 */
import {
  DEFAULT_COLOR_THEME,
  expandPath,
  parseColorTheme,
  type AppSettings,
  type AppSettingsView
} from '../../shared/app-settings'
import type { ConfigLocation } from './config-location'
import { readJsonFile, writeJsonFile } from './json-file'

export class SettingsStore {
  /**
   * @param location - where the configuration lives.
   * @param home - the user's home folder.
   */
  constructor(
    private readonly location: ConfigLocation,
    private readonly home: string
  ) {}

  /** What the local repositories path is when no configuration exists: the home folder. */
  get defaultLocalReposPath(): string {
    return this.home
  }

  /** The saved settings, defaults filling what was never saved. */
  read(): AppSettings {
    const raw = readJsonFile<Record<string, unknown>>(this.location.file('settings.json'), {})
    return {
      colorTheme: parseColorTheme(raw.colorTheme) ?? DEFAULT_COLOR_THEME,
      localReposPaths: this.readPaths(raw)
    }
  }

  /**
   * Reads the local repositories paths. A file written before several paths were allowed holds
   * one, `localReposPath`.
   *
   * @param raw - the settings file's content.
   */
  private readPaths(raw: Record<string, unknown>): string[] {
    const saved = Array.isArray(raw.localReposPaths)
      ? raw.localReposPaths
      : typeof raw.localReposPath === 'string'
        ? [raw.localReposPath]
        : []
    const paths = saved
      .filter((path): path is string => typeof path === 'string' && path.trim() !== '')
      .map((path) => path.trim())
    return paths.length > 0 ? [...new Set(paths)] : [this.defaultLocalReposPath]
  }

  /** The settings with where the configuration lives, as the settings page shows them. */
  view(): AppSettingsView {
    return {
      ...this.read(),
      configPath: this.location.current(),
      defaultConfigPath: this.location.defaultDir,
      defaultLocalReposPath: this.defaultLocalReposPath
    }
  }

  /**
   * Saves some of the settings, keeping the others.
   *
   * @param change - the settings to change.
   */
  write(change: Partial<AppSettings>): void {
    writeJsonFile(this.location.file('settings.json'), { ...this.read(), ...change })
  }

  /** The local repositories paths with the home folder written out. */
  expandedLocalReposPaths(): string[] {
    return this.read().localReposPaths.map((path) => expandPath(path, this.home))
  }
}
