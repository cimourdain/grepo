/**
 * The app's entry among the Linux desktop's applications: a `.desktop` file and an icon, under the
 * user's own data folder. Desktops find a running window's icon and name through this file, whose
 * name and `StartupWMClass` match the window's class, so without one (an AppImage installs none) a
 * dock or taskbar shows a generic icon. This follows the freedesktop.org specifications, not one
 * desktop. Other systems get this from their installers: nothing calls this there.
 *
 * It is written at each start, so an AppImage moved elsewhere is still found. A run from the
 * sources (not packaged) is hidden from the applications menu, and doesn't replace the entry of an
 * installed app.
 *
 * @example
 * installLinuxDesktopEntry({ dataHome: '/home/me/.local/share', command: ['/opt/Grepo.AppImage'], icon, listed: true })
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** The window class, which is the app's name: what the entry is matched with. */
export const LINUX_WINDOW_CLASS = 'grepo'

/**
 * Tells whether a system package installed the app: its desktop entry is among the system's data
 * folders. Such an install doesn't write a user entry, so the applications menu doesn't list it
 * twice.
 *
 * @param dataDirs - the system's data folders (`$XDG_DATA_DIRS`, by default `/usr/local/share:/usr/share`).
 */
export function installedBySystemPackage(dataDirs: readonly string[]): boolean {
  return dataDirs.some((folder) =>
    existsSync(join(folder, 'applications', `${LINUX_WINDOW_CLASS}.desktop`))
  )
}

/** What an entry says. */
export interface DesktopEntryContent {
  /** What starts the app, as separate arguments. */
  command: readonly string[]
  /** The absolute path of the icon. */
  iconPath: string
  /** Whether the applications menu lists it. */
  listed: boolean
}

/** What installing an entry needs. */
export interface DesktopEntryInstallation {
  /** The user's data folder: `$XDG_DATA_HOME`, by default `~/.local/share`. */
  dataHome: string
  command: readonly string[]
  /** The icon's PNG file. */
  icon: Uint8Array
  listed: boolean
}

/**
 * Quotes an `Exec` argument, as the Desktop Entry specification asks.
 *
 * @param argument - an argument.
 */
function quotedExecArgument(argument: string): string {
  if (/^[\w./:=+-]+$/.test(argument)) return argument
  const escaped = argument.replace(/[\\"`$]/g, (character) => `\\${character}`)
  // The file's own format then reads a backslash as an escape: it has to be doubled.
  return `"${escaped}"`.replace(/\\/g, '\\\\')
}

/**
 * Writes a `.desktop` file.
 *
 * @param content - what it says.
 * @returns the file's text.
 */
export function desktopEntryText({ command, iconPath, listed }: DesktopEntryContent): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Grepo',
    'Comment=Browse, filter and open the local repositories of a workspace',
    `Exec=${command.map(quotedExecArgument).join(' ')}`,
    `Icon=${iconPath}`,
    'Terminal=false',
    'Categories=Development;Utility;',
    `StartupWMClass=${LINUX_WINDOW_CLASS}`,
    ...(listed ? [] : ['NoDisplay=true']),
    ''
  ].join('\n')
}

/**
 * Writes the entry and its icon.
 *
 * @param installation - where, and what it says.
 * @returns whether it was written: an unlisted run leaves an installed app's entry alone.
 */
export function installLinuxDesktopEntry(installation: DesktopEntryInstallation): boolean {
  const { dataHome, command, icon, listed } = installation
  const entryPath = join(dataHome, 'applications', `${LINUX_WINDOW_CLASS}.desktop`)
  if (
    !listed &&
    existsSync(entryPath) &&
    !readFileSync(entryPath, 'utf8').includes('NoDisplay=true')
  ) {
    return false
  }
  const iconFolder = join(dataHome, 'icons', 'hicolor', '512x512', 'apps')
  const iconPath = join(iconFolder, `${LINUX_WINDOW_CLASS}.png`)
  mkdirSync(iconFolder, { recursive: true })
  writeFileSync(iconPath, icon)
  mkdirSync(join(dataHome, 'applications'), { recursive: true })
  writeFileSync(entryPath, desktopEntryText({ command, iconPath, listed }))
  return true
}
