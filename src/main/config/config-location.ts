/**
 * Where the local configuration lives. By default `~/.config/grepo`; the user can choose another
 * folder in Settings. That choice can't be saved inside the folder it moves, so it is kept in a
 * small pointer file, `location.json`, in the default folder.
 *
 * @example
 * const location = new ConfigLocation('/home/me')
 * location.current() // '/home/me/.config/grepo'
 * location.file('settings.json') // '/home/me/.config/grepo/settings.json'
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { expandPath, isAbsolutePath } from '../../shared/app-settings'
import { readJsonFile, writeJsonFile } from './json-file'

/** The files of the configuration folder, copied when the folder changes. */
export const CONFIG_FILES = [
  'settings.json',
  'repositories.json',
  'presets.json',
  'repo-rules.json',
  'repo-views.json',
  'github-auth.json',
  'github-orgs.json',
  'github-repositories.json'
] as const

/** The name the app had before it was renamed Grepo: its configuration folder is migrated. */
export const LEGACY_APP_NAME = 'gaviv'

/**
 * Copies the configuration of the app's former name to the current folder, once: when the former
 * folder exists and the current one holds no configuration yet. The GitHub login isn't copied: its
 * token is encrypted with a keyring entry named after the app, which the new name can't read, so
 * the user logs in again. Nothing is deleted from the former folder.
 *
 * @param legacyDir - the former configuration folder.
 * @param currentDir - the current configuration folder.
 * @returns the names of the files copied.
 */
export function migrateLegacyConfig(legacyDir: string, currentDir: string): string[] {
  if (!existsSync(legacyDir) || existsSync(join(currentDir, 'settings.json'))) return []
  const copied: string[] = []
  for (const name of [...CONFIG_FILES, 'location.json']) {
    if (name === 'github-auth.json') continue
    const from = join(legacyDir, name)
    const to = join(currentDir, name)
    if (!existsSync(from) || existsSync(to)) continue
    mkdirSync(currentDir, { recursive: true })
    copyFileSync(from, to)
    copied.push(name)
  }
  return copied
}

export class ConfigLocation {
  /** The folder used when the user didn't choose one. */
  readonly defaultDir: string
  private readonly pointerFile: string

  /**
   * @param home - the user's home folder.
   * @param defaultDir - the default configuration folder (default `<home>/.config/grepo`).
   */
  constructor(
    private readonly home: string,
    defaultDir = join(home, '.config', 'grepo')
  ) {
    this.defaultDir = defaultDir
    this.pointerFile = join(defaultDir, 'location.json')
  }

  /** The configuration folder in use. */
  current(): string {
    const saved = readJsonFile<{ configPath?: unknown }>(this.pointerFile, {}).configPath
    return typeof saved === 'string' && saved.trim() !== '' ? saved : this.defaultDir
  }

  /**
   * The path of a file of the configuration folder.
   *
   * @param name - the file's name.
   */
  file(name: string): string {
    return join(this.current(), name)
  }

  /**
   * Moves the configuration to another folder: creates it and copies the files the new folder
   * doesn't have yet, so the settings follow, without overwriting what it already holds.
   *
   * @param path - the new folder, as typed (`~` and `${HOME}` allowed); absolute once expanded.
   * @throws when the path isn't absolute or the folder can't be created.
   */
  change(path: string): void {
    const target = expandPath(path, this.home)
    if (!isAbsolutePath(target)) throw new Error('The configuration path must be absolute.')
    const source = this.current()
    mkdirSync(target, { recursive: true })
    if (target !== source) {
      for (const name of CONFIG_FILES) {
        const from = join(source, name)
        const to = join(target, name)
        if (existsSync(from) && !existsSync(to)) copyFileSync(from, to)
      }
    }
    if (target === this.defaultDir) writeJsonFile(this.pointerFile, {})
    else writeJsonFile(this.pointerFile, { configPath: target })
  }
}
