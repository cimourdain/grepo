import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GeneralSettings from './GeneralSettings.vue'
import RulesSettings from './RulesSettings.vue'
import ViewsSettings from './ViewsSettings.vue'

const api = {
  getSettings: vi.fn(),
  saveGeneralSettings: vi.fn(),
  refreshRepositories: vi.fn(),
  getRepoRules: vi.fn(),
  saveRepoRules: vi.fn(),
  getRepoViews: vi.fn(),
  saveRepoViews: vi.fn(),
  loadImage: vi.fn()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  api.getSettings.mockResolvedValue({
    configPath: '/home/me/.config/grepo',
    defaultConfigPath: '/home/me/.config/grepo',
    localReposPaths: ['/home/me/code'],
    defaultLocalReposPath: '/home/me/code'
  })
  api.saveGeneralSettings.mockResolvedValue({ success: true })
  api.getRepoRules.mockResolvedValue({
    namingRules: [{ search: '^shop', type: 'text', value: 'G' }],
    tagRules: [{ search: 'web', tags: ['web'], target: 'name' }],
    tagColors: {}
  })
  api.saveRepoRules.mockResolvedValue({ success: true })
  api.getRepoViews.mockResolvedValue({
    views: [{ id: 'default', name: 'Default', fontSize: 16, minItemWidth: 300 }],
    defaultId: 'default'
  })
  api.saveRepoViews.mockResolvedValue({ success: true })
  ;(window as unknown as { api: unknown }).api = api
})
afterEach(() => vi.useRealTimers())

/** Lets the loads and the pause of the autosave pass. */
async function settle(): Promise<void> {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(700)
  await flushPromises()
}

describe('GeneralSettings', () => {
  it('has a Local repositories section (explanation, paths, Refresh) then a Configuration section', async () => {
    const wrapper = mount(GeneralSettings)
    await settle()
    const sections = wrapper.findAll('section[aria-label]')
    expect(sections.map((section) => section.find('h3').text())).toEqual([
      'Local repositories',
      'Configuration'
    ])
    const repos = sections[0]!
    expect(repos.find('p.settings-hint').text()).toMatch(
      /inspected recursively.*git\s+repositories/s
    )
    const order = [...repos.element.querySelectorAll('p.settings-hint, form, button')].map(
      (element) => element.tagName
    )
    expect(order.indexOf('P')).toBeLessThan(order.indexOf('FORM'))
    expect(repos.findAll('button').at(-1)!.text()).toBe('Refresh')
    expect(repos.find('form input[aria-label="Local repositories path 1"]').exists()).toBe(true)
    expect(sections[1]!.find('input[aria-label="Local configuration path"]').exists()).toBe(true)
  })

  it('has no Save button, and saves the paths by itself once valid', async () => {
    const wrapper = mount(GeneralSettings)
    await settle()
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain('Save')
    expect(api.saveGeneralSettings).not.toHaveBeenCalled() // loading saves nothing

    await wrapper.find('button.settings-button').trigger('click') // Add a path
    await wrapper.find('input[aria-label="Local repositories path 2"]').setValue('${HOME}/work')
    await settle()
    expect(api.saveGeneralSettings).toHaveBeenCalledWith({
      localReposPaths: ['/home/me/code', '${HOME}/work']
    })
    expect(wrapper.text()).toContain('Saved.')
  })

  it('does not save a relative path, and says so', async () => {
    const wrapper = mount(GeneralSettings)
    await settle()
    await wrapper.find('input[aria-label="Local repositories path 1"]').setValue('relative/dir')
    await settle()
    expect(api.saveGeneralSettings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Not saved yet: “relative/dir” is not an absolute path.')
  })

  it('accepts Windows paths', async () => {
    const wrapper = mount(GeneralSettings)
    await settle()
    await wrapper.find('input[aria-label="Local repositories path 1"]').setValue('C:\\Sites\\repos')
    await settle()
    expect(api.saveGeneralSettings).toHaveBeenCalledWith({ localReposPaths: ['C:\\Sites\\repos'] })
    expect(wrapper.text()).toContain('Saved.')
  })

  it('removes a path, keeping at least one', async () => {
    api.getSettings.mockResolvedValue({
      configPath: '/c',
      defaultConfigPath: '/c',
      localReposPaths: ['/a', '/b'],
      defaultLocalReposPath: '/a'
    })
    const wrapper = mount(GeneralSettings)
    await settle()
    await wrapper.find('button[aria-label="Remove path 1"]').trigger('click')
    await settle()
    expect(api.saveGeneralSettings).toHaveBeenCalledWith({ localReposPaths: ['/b'] })
    expect(wrapper.find('button[aria-label="Remove path 1"]').attributes('disabled')).toBeDefined()
  })

  it('saves the configuration path when its field is left, not at each key', async () => {
    const wrapper = mount(GeneralSettings)
    await settle()
    const field = wrapper.find('input[aria-label="Local configuration path"]')
    // Typing fires `input` only; `change` comes when the field is left (VTU's setValue fires both).
    ;(field.element as HTMLInputElement).value = '/srv/gav'
    await field.trigger('input')
    await settle()
    expect(api.saveGeneralSettings).not.toHaveBeenCalled()
    await field.trigger('change')
    await flushPromises()
    expect(api.saveGeneralSettings).toHaveBeenCalledWith({ configPath: '/srv/gav' })
  })
})

describe('RulesSettings', () => {
  it('has no Save button and saves a valid edit by itself, not an invalid one', async () => {
    const wrapper = mount(RulesSettings)
    await settle()
    expect(wrapper.text()).not.toContain('Save rules')
    expect(api.saveRepoRules).not.toHaveBeenCalled()

    await wrapper.find('input[aria-label="Tag rule 1 tags"]').setValue('web, ui')
    await settle()
    expect(api.saveRepoRules).toHaveBeenCalledWith({
      namingRules: [{ search: '^shop', type: 'text', value: 'G' }],
      tagRules: [{ search: 'web', tags: ['web', 'ui'], target: 'name' }],
      tagColors: {}
    })

    api.saveRepoRules.mockClear()
    await wrapper.find('input[aria-label="Naming rule 1 search query"]').setValue('(')
    await settle()
    expect(api.saveRepoRules).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Not saved yet: Naming rule 1')
  })
})

describe('ViewsSettings', () => {
  it('is titled as the styling configuration, and saves by itself', async () => {
    const wrapper = mount(ViewsSettings)
    await settle()
    expect(wrapper.find('h3').text()).toBe('Repositories view styling configuration')
    expect(wrapper.text()).not.toContain('Save views')
    await wrapper.find('input[aria-label="View 1 font size"]').setValue('14')
    await settle()
    expect(api.saveRepoViews).toHaveBeenCalledWith({
      views: [{ id: 'default', name: 'Default', fontSize: 14, minItemWidth: 300 }],
      defaultId: 'default'
    })
  })

  it('does not save two views with the same name', async () => {
    const wrapper = mount(ViewsSettings)
    await settle()
    await wrapper.find('.view-actions button').trigger('click') // Add a view
    await wrapper.find('input[aria-label="View 2 name"]').setValue('default')
    await settle()
    expect(api.saveRepoViews).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Not saved yet: Two views are named')
  })
})
