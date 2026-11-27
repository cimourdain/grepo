import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppTitleBar from './AppTitleBar.vue'

let maximizedListener: (maximized: boolean) => void = () => {}
const api = {
  getWindowChrome: vi.fn(),
  applyWindowControl: vi.fn().mockResolvedValue(undefined),
  onWindowMaximizedChanged: vi.fn((listener: (maximized: boolean) => void) => {
    maximizedListener = listener
    return () => {}
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as unknown as { api: unknown }).api = api
})

describe('AppTitleBar', () => {
  it('shows the app icon and name, and the window buttons', async () => {
    api.getWindowChrome.mockResolvedValue({ drawsControls: true, maximized: false })
    const wrapper = mount(AppTitleBar)
    await flushPromises()
    expect(wrapper.find('img.app-title-bar-icon').attributes('src')).toBeTruthy()
    expect(wrapper.find('.app-title-bar-name').text()).toBe('Grepo')
    await wrapper.find('.app-title-bar-minimize').trigger('click')
    await wrapper.find('.app-title-bar-maximize').trigger('click')
    await wrapper.find('.app-title-bar-close').trigger('click')
    expect(api.applyWindowControl.mock.calls.map((call) => call[0])).toEqual([
      'minimize',
      'toggle-maximize',
      'close'
    ])
  })

  it('follows the window being maximized', async () => {
    api.getWindowChrome.mockResolvedValue({ drawsControls: true, maximized: false })
    const wrapper = mount(AppTitleBar)
    await flushPromises()
    expect(wrapper.find('.app-title-bar-maximize').attributes('aria-label')).toBe('Maximize')
    maximizedListener(true)
    await flushPromises()
    expect(wrapper.find('.app-title-bar-maximize').attributes('aria-label')).toBe('Restore')
  })

  it('draws no buttons where the system keeps its own (macOS), but keeps the icon', async () => {
    api.getWindowChrome.mockResolvedValue({ drawsControls: false, maximized: false })
    const wrapper = mount(AppTitleBar)
    await flushPromises()
    expect(wrapper.find('.app-title-bar-controls').exists()).toBe(false)
    expect(wrapper.find('.app-title-bar-icon').exists()).toBe(true)
  })

  it('shows nothing outside the desktop app', () => {
    ;(window as unknown as { api?: unknown }).api = undefined
    expect(mount(AppTitleBar).find('.app-title-bar').exists()).toBe(false)
  })
})
