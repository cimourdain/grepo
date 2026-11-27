/**
 * The window's minimize, maximize and close actions, for the title bar the app draws: desktops
 * such as GNOME show no icon in theirs. What a window draws depends on the system: macOS keeps its
 * own buttons, placed over the title bar.
 *
 * @example
 * applyWindowControl(window, 'toggle-maximize')
 * windowChromeOf('darwin', false) // { drawsControls: false, maximized: false }
 */
import type { WindowChrome } from '../../shared/ipc-contract'

/** What the actions need of a window. */
export interface ControlledWindow {
  minimize(): void
  maximize(): void
  unmaximize(): void
  isMaximized(): boolean
  close(): void
}

/**
 * Tells what the title bar draws.
 *
 * @param platform - the system.
 * @param maximized - whether the window is maximized.
 */
export function windowChromeOf(platform: NodeJS.Platform, maximized: boolean): WindowChrome {
  return { drawsControls: platform !== 'darwin', maximized }
}

/**
 * Applies an action.
 *
 * @param window - the window.
 * @param control - the action (untrusted: from an IPC payload).
 */
export function applyWindowControl(window: ControlledWindow, control: unknown): void {
  if (control === 'minimize') window.minimize()
  else if (control === 'close') window.close()
  else if (control === 'toggle-maximize') {
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  }
}
