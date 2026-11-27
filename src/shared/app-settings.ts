/**
 * The application's settings, saved as `settings.json` in the local configuration folder, and
 * the pure helpers reading them.
 *
 * @example
 * expandPath('${HOME}', '/home/me') // '/home/me/code'
 * parseColorTheme('sepia') // null
 */

/** The included color themes, in display order (`./themes/included-themes.ts`). */
export const colorThemes = [
  'light',
  'catppuccin-latte',
  'catppuccin-frappe',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'gruvbox-dark',
  'gruvbox-light',
  'gruvbox-material-dark',
  'gruvbox-material-light',
  'nord-polar-night',
  'nord-snow-storm',
  'nord-frost',
  'nord-aurora',
  'tokyo-night',
  'tokyo-night-storm',
  'tokyo-night-light'
] as const

/** An included color theme. */
export type ColorTheme = (typeof colorThemes)[number]

/** The settings the user edits, saved in the configuration folder. */
export interface AppSettings {
  colorTheme: ColorTheme
  /** Where the local repositories are (one or several folders), scanned by the Refresh button. */
  localReposPaths: string[]
}

/** What the settings page shows: the saved settings, and where the configuration lives. */
export interface AppSettingsView extends AppSettings {
  /** The local configuration folder in use. */
  configPath: string
  /** The folder the configuration lives in when the user didn't choose one. */
  defaultConfigPath: string
  /** What the local repositories paths are when never saved (one folder). */
  defaultLocalReposPath: string
}

/** The theme a first start shows. */
export const DEFAULT_COLOR_THEME: ColorTheme = 'catppuccin-mocha'

/**
 * Tells whether a value names an included theme.
 *
 * @param value - the value (untrusted).
 * @returns the theme, `null` when it isn't one.
 */
export function parseColorTheme(value: unknown): ColorTheme | null {
  return typeof value === 'string' && (colorThemes as readonly string[]).includes(value)
    ? (value as ColorTheme)
    : null
}

/**
 * Tells whether a path is absolute, on any system: POSIX (`/home/me`), Windows with a drive
 * (`C:\Sites\repo`, `C:/Sites/repo`) or a network share (`\\server\share`). The app runs on
 * Linux and Windows, so a path typed in either form is accepted whichever the system it runs on.
 *
 * @param path - the path, already expanded.
 * @example
 * isAbsolutePath('C:\\Sites\\repo') // true
 * isAbsolutePath('relative/dir') // false
 */
export function isAbsolutePath(path: string): boolean {
  return /^(?:\/|[A-Za-z]:[\\/]|\\\\)/.test(path)
}

/**
 * Expands a path typed by the user: `~`, `$HOME` and `${HOME}` stand for the home folder (`~` only
 * at the start, followed by a separator of either kind).
 *
 * @param path - the path as typed.
 * @param home - the home folder.
 * @returns the path with the home folder written out, trimmed.
 */
export function expandPath(path: string, home: string): string {
  const trimmed = path.trim()
  const expanded = trimmed
    .replace(/^~(?=$|[\\/])/, home)
    .replace(/\$\{HOME\}|\$HOME(?![\w])/g, home)
  return expanded
}
