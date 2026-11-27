/**
 * The app's icon, read from its files whether the app is packaged or not (`resources/app-icon.png`,
 * inside the asar archive when packaged), as an Electron image.
 *
 * A window must be given a small enough icon: on Linux, a window given 256 pixels or more ends up
 * with none, so `loadWindowIcon` resizes it.
 *
 * @example
 * new BrowserWindow({ icon: loadWindowIcon() })
 * new Tray(loadTrayIcon())
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, nativeImage, type NativeImage } from 'electron'

/** The window icon's size. */
const WINDOW_ICON_SIZE = 128

/** The tray icon's size: systems scale it from there. */
const TRAY_ICON_SIZE = 22

/** The icon's file. */
export const appIconPath = (): string => join(app.getAppPath(), 'resources', 'app-icon.png')

/** The icon at full size. */
export function loadAppIcon(): NativeImage {
  return nativeImage.createFromBuffer(readFileSync(appIconPath()))
}

/** The icon a window is created with, at a size every system accepts. */
export function loadWindowIcon(): NativeImage {
  return loadAppIcon().resize({
    width: WINDOW_ICON_SIZE,
    height: WINDOW_ICON_SIZE,
    quality: 'best'
  })
}

/** The icon of the tray. */
export function loadTrayIcon(): NativeImage {
  return loadAppIcon().resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE, quality: 'best' })
}
