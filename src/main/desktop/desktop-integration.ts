/**
 * What tells the desktop about the app, through Electron: the Linux desktop entry (so docks and
 * taskbars show the app's icon and name) and the tray icon with its menu. Failing to write the
 * entry only costs a generic icon, so it is logged and goes no further.
 *
 * @example
 * installDesktopIntegration()
 * const tray = createTray({ onOpen: showWindow, onQuit: () => app.quit() })
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, Menu, Tray } from 'electron'

import { appIconPath, loadTrayIcon } from './app-icon'
import { installedBySystemPackage, installLinuxDesktopEntry } from './linux-desktop-entry'

/** What the tray's menu and click do. */
export interface TrayActions {
  onOpen(): void
  onQuit(): void
}

/** Tells the Linux desktop about the app (nothing on other systems, whose installers do it). */
export function installDesktopIntegration(): void {
  if (process.platform !== 'linux') return
  try {
    const dataHome = process.env['XDG_DATA_HOME'] || join(app.getPath('home'), '.local', 'share')
    const appImage = process.env['APPIMAGE']
    const packaged = app.isPackaged
    // A .deb or .rpm installs the entry itself: the AppImage alone writes its own.
    const dataDirs = (process.env['XDG_DATA_DIRS'] || '/usr/local/share:/usr/share').split(':')
    if (packaged && !appImage && installedBySystemPackage(dataDirs)) return
    installLinuxDesktopEntry({
      dataHome,
      command: appImage
        ? [appImage]
        : packaged
          ? [process.execPath]
          : [process.execPath, app.getAppPath()],
      icon: readFileSync(appIconPath()),
      listed: packaged
    })
  } catch (error) {
    console.warn('Desktop entry not written:', error instanceof Error ? error.message : error)
  }
}

/**
 * Adds the tray icon, with a menu (some Linux desktops only ever show the menu) and a click that
 * opens the window.
 *
 * @param actions - what the menu and the click do.
 * @returns the tray, kept by the caller so it isn't garbage-collected.
 */
export function createTray(actions: TrayActions): Tray {
  const tray = new Tray(loadTrayIcon())
  tray.setToolTip('Grepo')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Grepo', click: actions.onOpen },
      { type: 'separator' },
      { label: 'Quit', click: actions.onQuit }
    ])
  )
  tray.on('click', actions.onOpen)
  return tray
}
