import { describe, expect, it, vi } from 'vitest'

import { applyWindowControl, windowChromeOf } from './window-controls'

/** A window double. */
function fakeWindow(maximized: boolean): Parameters<typeof applyWindowControl>[0] & {
  minimize: ReturnType<typeof vi.fn>
  maximize: ReturnType<typeof vi.fn>
  unmaximize: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
} {
  return {
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: () => maximized
  }
}

describe('window controls', () => {
  it('minimizes, closes, and toggles the maximization', () => {
    const window = fakeWindow(false)
    applyWindowControl(window, 'minimize')
    applyWindowControl(window, 'close')
    applyWindowControl(window, 'toggle-maximize')
    expect(
      [window.minimize, window.close, window.maximize].map((f) => f.mock.calls.length)
    ).toEqual([1, 1, 1])
    const maximized = fakeWindow(true)
    applyWindowControl(maximized, 'toggle-maximize')
    expect(maximized.unmaximize).toHaveBeenCalledOnce()
  })

  it('ignores an action it does not know', () => {
    const window = fakeWindow(false)
    applyWindowControl(window, 'format-disk')
    applyWindowControl(window, 42)
    expect(window.minimize).not.toHaveBeenCalled()
    expect(window.close).not.toHaveBeenCalled()
  })

  it('draws the buttons except on macOS, which keeps its own', () => {
    expect(windowChromeOf('linux', true)).toEqual({ drawsControls: true, maximized: true })
    expect(windowChromeOf('win32', false).drawsControls).toBe(true)
    expect(windowChromeOf('darwin', false).drawsControls).toBe(false)
  })
})
