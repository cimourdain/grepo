import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ImportExportSettings from './ImportExportSettings.vue'

const api = {
  exportSettings: vi.fn(),
  previewImport: vi.fn(),
  applyImport: vi.fn(),
  listPresets: vi.fn()
}

const summary = {
  includesLocalPaths: true,
  localReposPaths: 2,
  namingRules: 1,
  tagRules: 3,
  views: 1,
  presets: 4
}

beforeEach(() => {
  vi.clearAllMocks()
  api.listPresets.mockResolvedValue([])
  ;(window as unknown as { api: unknown }).api = api
})

describe('ImportExportSettings', () => {
  it('exports and says what was written, where', async () => {
    api.exportSettings.mockResolvedValue({
      status: 'done',
      path: '/tmp/grepo-settings.json',
      summary
    })
    const wrapper = mount(ImportExportSettings)
    await wrapper.find('section[aria-label="Export"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('section[aria-label="Export"] .settings-message').text()).toContain(
      '/tmp/grepo-settings.json: 2 local repositories paths, 1 naming rule, 3 tag rules, 1 view, 4 presets'
    )
  })

  it('says nothing when the dialog is cancelled, and shows an error', async () => {
    api.exportSettings.mockResolvedValueOnce({ status: 'cancelled' })
    const wrapper = mount(ImportExportSettings)
    await wrapper.find('section[aria-label="Export"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.settings-message').exists()).toBe(false)
    api.exportSettings.mockResolvedValueOnce({ status: 'error', message: 'Permission denied.' })
    await wrapper.find('section[aria-label="Export"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('Permission denied.')
  })

  it('shows what a file holds and imports only after confirmation', async () => {
    api.previewImport.mockResolvedValue({ status: 'ready', path: '/tmp/in.json', summary })
    api.applyImport.mockResolvedValue({ status: 'done', path: '/tmp/in.json', summary })
    const wrapper = mount(ImportExportSettings)
    await wrapper.find('section[aria-label="Import"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.import-preview').text()).toContain('holds 2 local repositories paths')
    expect(api.applyImport).not.toHaveBeenCalled()

    await wrapper.find('.import-actions button').trigger('click')
    await flushPromises()
    expect(api.applyImport).toHaveBeenCalledOnce()
    expect(wrapper.emitted('imported')).toHaveLength(1)
    expect(api.listPresets).toHaveBeenCalled() // the sidebar follows
    expect(wrapper.find('.import-preview').exists()).toBe(false)
    expect(wrapper.text()).toContain('Imported from /tmp/in.json')
  })

  it('can cancel a checked file, and refuses an invalid one with the reason', async () => {
    api.previewImport.mockResolvedValueOnce({ status: 'ready', path: '/tmp/in.json', summary })
    const wrapper = mount(ImportExportSettings)
    await wrapper.find('section[aria-label="Import"] button').trigger('click')
    await flushPromises()
    await wrapper.findAll('.import-actions button')[1]!.trigger('click')
    expect(wrapper.find('.import-preview').exists()).toBe(false)
    expect(api.applyImport).not.toHaveBeenCalled()

    api.previewImport.mockResolvedValueOnce({
      status: 'error',
      message: 'This file is not valid JSON.'
    })
    await wrapper.find('section[aria-label="Import"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('This file is not valid JSON.')
    expect(wrapper.find('.import-preview').exists()).toBe(false)
  })

  it('includes the local-path settings by default, and exports without them when unticked', async () => {
    api.exportSettings.mockResolvedValue({ status: 'done', path: '/tmp/out.json', summary })
    const wrapper = mount(ImportExportSettings)
    const box = wrapper.find('input[aria-label="Include local path settings"]')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    await wrapper.find('section[aria-label="Export"] button').trigger('click')
    await flushPromises()
    expect(api.exportSettings).toHaveBeenLastCalledWith({ includeLocalPaths: true })

    await box.setValue(false)
    api.exportSettings.mockResolvedValue({
      status: 'done',
      path: '/tmp/out.json',
      summary: { ...summary, includesLocalPaths: false, localReposPaths: 0 }
    })
    await wrapper.find('section[aria-label="Export"] button').trigger('click')
    await flushPromises()
    expect(api.exportSettings).toHaveBeenLastCalledWith({ includeLocalPaths: false })
    expect(wrapper.find('section[aria-label="Export"] .settings-message').text()).toContain(
      'no local-path settings'
    )
  })
})
