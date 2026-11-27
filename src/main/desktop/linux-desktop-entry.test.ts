import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  desktopEntryText,
  installedBySystemPackage,
  installLinuxDesktopEntry,
  LINUX_WINDOW_CLASS
} from './linux-desktop-entry'

let folder: string

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'grepo-desktop-'))
})
afterEach(() => rmSync(folder, { recursive: true, force: true }))

describe('desktop entry', () => {
  it('names the app, its icon and the window class the desktop matches it with', () => {
    const text = desktopEntryText({
      command: ['/my apps/Grepo.AppImage'],
      iconPath: '/home/me/.local/share/icons/grepo.png',
      listed: true
    })
    expect(text).toContain('Name=Grepo')
    expect(text).toContain('Exec="/my apps/Grepo.AppImage"')
    expect(text).toContain('Icon=/home/me/.local/share/icons/grepo.png')
    expect(text).toContain(`StartupWMClass=${LINUX_WINDOW_CLASS}`)
    expect(LINUX_WINDOW_CLASS).toBe('grepo')
    expect(text).not.toContain('NoDisplay')
    expect(desktopEntryText({ command: ['x'], iconPath: '/i', listed: false })).toContain(
      'NoDisplay=true'
    )
  })

  it('writes the entry and the icon under the data folder, and leaves an installed entry alone when unlisted', () => {
    const icon = new Uint8Array([1, 2, 3])
    expect(
      installLinuxDesktopEntry({ dataHome: folder, command: ['/opt/Grepo'], icon, listed: true })
    ).toBe(true)
    const entry = join(folder, 'applications', 'grepo.desktop')
    const iconFile = join(folder, 'icons', 'hicolor', '512x512', 'apps', 'grepo.png')
    expect(readFileSync(entry, 'utf8')).toContain(`Icon=${iconFile}`)
    expect(existsSync(iconFile)).toBe(true)
    // A run from the sources doesn't replace the listed entry.
    expect(
      installLinuxDesktopEntry({ dataHome: folder, command: ['/src'], icon, listed: false })
    ).toBe(false)
    expect(readFileSync(entry, 'utf8')).toContain('Exec=/opt/Grepo')
  })

  it('knows when a system package installed the app', () => {
    expect(installedBySystemPackage([folder])).toBe(false)
    mkdirSync(join(folder, 'applications'))
    writeFileSyncEmpty(join(folder, 'applications', 'grepo.desktop'))
    expect(installedBySystemPackage([folder])).toBe(true)
  })
})

/**
 * Creates an empty file.
 *
 * @param path - the file.
 */
function writeFileSyncEmpty(path: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, '')
}
