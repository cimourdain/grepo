import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import type { Repository } from '../../../shared/repository'
import { clearMainPageState } from '../repos/main-page-state'
import ReposPage from './ReposPage.vue'
import { allAttributes } from '../../../shared/repo-views'

const ALL = allAttributes()

/** Builds a repository. */
function repo(folderName: string, cleanName: string): Repository {
  const org = folderName === 'tools' ? 'acme' : 'example'
  return {
    folderName,
    cleanName,
    cleanParts: [{ type: 'text', text: cleanName }],
    tags: folderName.startsWith('shop')
      ? ['shop', folderName.endsWith('web') ? 'frontend' : 'backend']
      : [],
    realName: `${org}/${folderName}`,
    path: `/w/${folderName}`,
    remoteUrl: null,
    github: { host: 'github.com', org, name: folderName },
    hasCircleci: false
  }
}

const api = {
  getRepositories: vi.fn(),
  getRepoViews: vi.fn(),
  getRepoRules: vi.fn(),
  getGithubLogin: vi.fn(),
  listPresets: vi.fn(),
  runRepositoryAction: vi.fn(),
  savePreset: vi.fn(),
  updatePreset: vi.fn(),
  deletePreset: vi.fn()
}

/** Mounts the page at an address. */
async function mountPage(path = '/repos'): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/repos', name: 'repos', component: ReposPage },
      { path: '/repos/preset/:presetName', name: 'repos-preset', component: ReposPage },
      { path: '/settings/:tab?', component: { template: '<div />' } }
    ]
  })
  await router.push(path)
  const wrapper = mount(ReposPage, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  clearMainPageState()
  api.getGithubLogin.mockResolvedValue({ loggedIn: false })
  api.getRepoRules.mockResolvedValue({
    namingRules: [],
    tagRules: [],
    tagColors: { frontend: '#336699' }
  })
  api.getRepoViews.mockResolvedValue({
    views: [
      { id: 'default', name: 'Default', fontSize: 16, minItemWidth: 300 },
      { id: 'compact', name: 'Compact', fontSize: 12, minItemWidth: 200 }
    ],
    defaultId: 'default'
  })
  api.getRepositories.mockResolvedValue({
    repositories: [
      repo('shop-web', 'Shop Web'),
      repo('shop-api', 'Shop Api'),
      repo('tools', 'Tools')
    ],
    scannedPaths: ['/w'],
    scannedAt: ''
  })
  api.listPresets.mockResolvedValue([
    {
      name: 'Shop',
      search: '^shop',
      tagFilter: {},
      orgFilter: {},
      viewId: 'default',
      attributes: ALL,
      sidebarEnabled: true,
      sidebarName: ''
    }
  ])
  api.runRepositoryAction.mockResolvedValue([
    { action: 'github', repository: 'shop-web', status: 'done', message: '' }
  ])
  api.savePreset.mockResolvedValue({ success: true })
  ;(window as unknown as { api: unknown }).api = api
})
afterEach(() => vi.clearAllMocks())

describe('ReposPage', () => {
  it('lists the repositories as cards with the clean name, org and name on two lines, and path', async () => {
    const { wrapper } = await mountPage()
    const cards = wrapper.findAll('.repository-card')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.find('.repository-card-title').text()).toBe('Shop Web')
    expect(cards[0]!.find('.repository-card-org').text()).toBe('example')
    expect(cards[0]!.find('.repository-card-name').text()).toBe('shop-web')
    expect(cards[0]!.text()).toContain('/w/shop-web')
    expect(cards[0]!.findAll('.repository-card-actions button').map((b) => b.text())).toEqual([
      'Github',
      'Circleci',
      'VSCode',
      'All'
    ])
  })

  it('filters with a regular expression and flags an invalid one', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('.repos-search-input').setValue('^shop-(web|api)$')
    expect(wrapper.findAll('.repository-card')).toHaveLength(2)
    await wrapper.find('.repos-search-input').setValue('(')
    expect(wrapper.find('[role="alert"]').text()).toContain('Invalid regular expression')
    expect(wrapper.findAll('.repository-card')).toHaveLength(3)
  })

  it('runs a card action on that repository only', async () => {
    const { wrapper } = await mountPage()
    await wrapper
      .findAll('.repository-card')[0]!
      .find('.repository-card-action--github')
      .trigger('click')
    expect(api.runRepositoryAction).toHaveBeenCalledWith('github', ['/w/shop-web'])
  })

  it('runs the menu action on the selected repositories', async () => {
    const { wrapper } = await mountPage()
    const run = wrapper.find('.repos-run')
    expect(run.attributes('disabled')).toBeDefined()
    await wrapper.findAll('.repository-card-select')[1]!.setValue(true)
    await wrapper.findAll('.repository-card-select')[2]!.setValue(true)
    await wrapper.find('.repos-action-select').setValue('vscode')
    await run.trigger('click')
    expect(api.runRepositoryAction).toHaveBeenCalledWith('vscode', ['/w/shop-api', '/w/tools'])
  })

  it('selects every displayed repository', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('.repos-search-input').setValue('shop')
    await wrapper.find('.repos-select-all input').setValue(true)
    expect(wrapper.find('.repos-select-all').text()).toContain('2 selected')
  })

  it('saves the search text as a preset', async () => {
    const { wrapper, router } = await mountPage()
    await wrapper.find('.repos-search-input').setValue('-web$')
    await wrapper.findAll('.repos-preset-button')[0]!.trigger('click')
    await wrapper.find('.repos-preset-form input').setValue('Web apps')
    // The saved preset is part of the list read again.
    api.listPresets.mockResolvedValue([
      {
        name: 'Web apps',
        search: '-web$',
        tagFilter: {},
        orgFilter: {},
        viewId: 'default',
        attributes: ALL,
        sidebarEnabled: true,
        sidebarName: ''
      }
    ])
    await wrapper.find('.repos-preset-form').trigger('submit')
    await flushPromises()
    expect(api.savePreset).toHaveBeenCalledWith('Web apps', {
      search: '-web$',
      tagFilter: {},
      orgFilter: {},
      viewId: 'default',
      attributes: ALL
    })
    expect(router.currentRoute.value.fullPath).toBe('/repos/preset/Web%20apps')
  })

  it('opens a preset with its search, and updates it with the current one', async () => {
    api.updatePreset.mockResolvedValue({ success: true })
    const { wrapper } = await mountPage('/repos/preset/Shop')
    expect((wrapper.find('.repos-search-input').element as HTMLInputElement).value).toBe('^shop')
    expect(wrapper.find('h2').text()).toBe('Shop')
    await wrapper.find('.repos-search-input').setValue('^shop-web')
    await wrapper.findAll('.repos-preset-button')[0]!.trigger('click')
    expect(api.updatePreset).toHaveBeenCalledWith('Shop', {
      search: '^shop-web',
      tagFilter: {},
      orgFilter: {},
      viewId: 'default',
      attributes: ALL
    })
  })

  it('shows each repository tags', async () => {
    const { wrapper } = await mountPage()
    const tags = wrapper.findAll('.repository-card')[0]!.findAll('.repository-card-tag')
    expect(tags.map((tag) => tag.text())).toEqual(['shop', 'frontend'])
    expect(wrapper.findAll('.repository-card')[2]!.find('.repository-card-tags').exists()).toBe(
      false
    )
  })

  it('filters on tags from the filter popover, tri-state', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('.popover-menu-trigger').trigger('click')
    await wrapper.findAll('.filter-group-toggle')[1]!.trigger('click')
    const checkbox = (label: string): DOMWrapper<Element> =>
      wrapper.findAll('.tri-state-checkbox').find((box) => box.text().includes(label))!
    expect(wrapper.findAll('.tri-state-checkbox').map((box) => box.text())).toEqual([
      'backend',
      'frontend',
      'shop'
    ])
    await checkbox('frontend').trigger('click') // only
    expect(wrapper.findAll('.repository-card-title').map((t) => t.text())).toEqual(['Shop Web'])
    await checkbox('frontend').trigger('click') // exclude
    expect(wrapper.findAll('.repository-card-title').map((t) => t.text())).toEqual([
      'Shop Api',
      'Tools'
    ])
  })

  it('saves the tag filter in a preset', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('.popover-menu-trigger').trigger('click')
    await wrapper.findAll('.filter-group-toggle')[1]!.trigger('click')
    await wrapper.findAll('.tri-state-checkbox')[0]!.trigger('click')
    await wrapper.findAll('.repos-preset-button')[0]!.trigger('click')
    await wrapper.find('.repos-preset-form input').setValue('Back')
    api.listPresets.mockResolvedValue([
      {
        name: 'Back',
        search: '',
        tagFilter: { backend: 'only' },
        orgFilter: {},
        viewId: 'default',
        attributes: ALL,
        sidebarEnabled: true,
        sidebarName: ''
      }
    ])
    await wrapper.find('.repos-preset-form').trigger('submit')
    await flushPromises()
    expect(api.savePreset).toHaveBeenCalledWith('Back', {
      search: '',
      tagFilter: { backend: 'only' },
      orgFilter: {},
      viewId: 'default',
      attributes: ALL
    })
  })

  it('renders image parts of a clean name', async () => {
    api.getRepositories.mockResolvedValue({
      repositories: [
        {
          ...repo('shop-web', 'Checkout'),
          cleanParts: [
            { type: 'image', path: '/i.png', src: 'data:image/png;base64,AAAA' },
            { type: 'text', text: 'Checkout' }
          ]
        }
      ],
      scannedPaths: ['/w'],
      scannedAt: ''
    })
    const { wrapper } = await mountPage()
    expect(wrapper.find('.repository-card-title img').attributes('src')).toBe(
      'data:image/png;base64,AAAA'
    )
    expect(wrapper.find('.repository-card-title').text()).toBe('Checkout')
  })

  it('filters on the org from the filter popover, tri-state, and saves it in a preset', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('.popover-menu-trigger').trigger('click')
    await wrapper.findAll('.filter-group-toggle')[0]!.trigger('click')
    expect(wrapper.findAll('.tri-state-checkbox').map((box) => box.text())).toEqual([
      'acme',
      'example'
    ])
    await wrapper.findAll('.tri-state-checkbox')[0]!.trigger('click') // only acme
    expect(wrapper.findAll('.repository-card-title').map((t) => t.text())).toEqual(['Tools'])
    await wrapper.findAll('.tri-state-checkbox')[0]!.trigger('click') // exclude acme
    expect(wrapper.findAll('.repository-card-title')).toHaveLength(2)

    await wrapper.findAll('.repos-preset-button')[0]!.trigger('click')
    await wrapper.find('.repos-preset-form input').setValue('Not acme')
    api.listPresets.mockResolvedValue([
      {
        name: 'Not acme',
        search: '',
        tagFilter: {},
        orgFilter: { acme: 'exclude' },
        viewId: 'default',
        attributes: ALL,
        sidebarEnabled: true,
        sidebarName: ''
      }
    ])
    await wrapper.find('.repos-preset-form').trigger('submit')
    await flushPromises()
    expect(api.savePreset).toHaveBeenCalledWith('Not acme', {
      search: '',
      tagFilter: {},
      orgFilter: { acme: 'exclude' },
      viewId: 'default',
      attributes: ALL
    })
  })

  it('uses the default view, and switches to another from the View menu', async () => {
    const { wrapper } = await mountPage()
    const grid = wrapper.find('.repos-grid')
    expect(grid.attributes('style')).toContain('font-size: 16px')
    expect(grid.attributes('style')).toContain('minmax(300px, 1fr)')
    await wrapper.findAll('.popover-menu-trigger')[1]!.trigger('click')
    await wrapper.findAll('.filter-group-toggle')[0]!.trigger('click')
    expect(wrapper.findAll('.repos-view-choice').map((c) => c.text())).toEqual([
      'Default (default)',
      'Compact'
    ])
    await wrapper.findAll('.repos-view-choice input')[1]!.setValue(true)
    expect(wrapper.find('.repos-grid').attributes('style')).toContain('font-size: 12px')
    expect(wrapper.find('.repos-grid').attributes('style')).toContain('minmax(200px, 1fr)')
  })

  it('toggles the attributes of the cards', async () => {
    const { wrapper } = await mountPage()
    await wrapper.findAll('.popover-menu-trigger')[1]!.trigger('click')
    await wrapper.findAll('.filter-group-toggle')[1]!.trigger('click')
    const toggle = async (label: string): Promise<void> => {
      await wrapper.find(`input[aria-label="Show ${label}"]`).setValue(false)
    }
    await toggle('org')
    expect(wrapper.find('.repository-card-org').exists()).toBe(false)
    expect(wrapper.find('.repository-card-name').exists()).toBe(true)
    await toggle('name')
    expect(wrapper.find('.repository-card-identity').exists()).toBe(false)
    await toggle('tags')
    expect(wrapper.find('.repository-card-tags').exists()).toBe(false)
    await toggle('buttons')
    expect(wrapper.find('.repository-card-actions').exists()).toBe(false)
  })

  it('saves the view and the attributes in a preset, and restores them', async () => {
    const { wrapper } = await mountPage()
    await wrapper.findAll('.popover-menu-trigger')[1]!.trigger('click')
    await wrapper.findAll('.filter-group-toggle')[0]!.trigger('click')
    await wrapper.findAll('.repos-view-choice input')[1]!.setValue(true)
    await wrapper.findAll('.filter-group-toggle')[1]!.trigger('click')
    await wrapper.find('input[aria-label="Show tags"]').setValue(false)
    await wrapper.findAll('.repos-preset-button')[0]!.trigger('click')
    await wrapper.find('.repos-preset-form input').setValue('Compact')
    const attributes = { ...ALL, tags: false }
    api.listPresets.mockResolvedValue([
      {
        name: 'Compact',
        search: '',
        tagFilter: {},
        orgFilter: {},
        viewId: 'compact',
        attributes,
        sidebarEnabled: true,
        sidebarName: ''
      }
    ])
    await wrapper.find('.repos-preset-form').trigger('submit')
    await flushPromises()
    expect(api.savePreset).toHaveBeenCalledWith('Compact', {
      search: '',
      tagFilter: {},
      orgFilter: {},
      viewId: 'compact',
      attributes
    })
    // Opening the preset applies them.
    expect(wrapper.find('.repos-grid').attributes('style')).toContain('font-size: 12px')
    expect(wrapper.find('.repository-card-tags').exists()).toBe(false)
  })

  it('colors tags: the color chosen in Settings, else one from the name', async () => {
    const { wrapper } = await mountPage()
    const [shop, frontend] = wrapper.findAll('.repository-card')[0]!.findAll('.repository-card-tag')
    expect(frontend!.attributes('style')).toContain('background: #336699')
    expect(shop!.attributes('style')).toMatch(/background: #[0-9A-F]{6}/)
    expect(shop!.attributes('style')).not.toBe(frontend!.attributes('style'))
  })

  it('lays the toolbar out in two columns: search to Run on the left, filters to presets on the right', async () => {
    const { wrapper } = await mountPage()
    const columns = [...wrapper.find('.repos-toolbar').element.children].map(
      (column) => column.className
    )
    expect(columns).toEqual(['repos-toolbar-left', 'repos-toolbar-right'])
    const names = (selector: string): string[] =>
      [...wrapper.find(selector).element.children].map((child) => child.className.split(' ')[0]!)
    expect(names('.repos-toolbar-left')).toEqual([
      'repos-search',
      'repos-select-all',
      'repos-action-menu'
    ])
    expect(wrapper.find('.repos-toolbar-left .repos-run').exists()).toBe(true)
    expect(names('.repos-toolbar-right')).toEqual(['popover-menu', 'popover-menu', 'repos-presets'])
    expect(
      wrapper
        .findAll('.repos-toolbar-right .popover-menu-trigger')
        .map((t) => t.attributes('aria-label'))
    ).toEqual(['Filter', 'View'])
  })

  it('fixes the left column (search to Run) to 65% of the page', async () => {
    const { wrapper } = await mountPage()
    // Scoped styles are not applied by the test DOM: the rule is in the component's source.
    const source = readFileSync(resolve(__dirname, 'ReposPage.vue'), 'utf8')
    const rule = /\.repos-toolbar-left \{([^}]*)\}/.exec(source)![1]!
    expect(rule).toMatch(/flex:\s*0 0 65%/)
    expect(rule).toMatch(/max-width:\s*65%/)
    expect(wrapper.find('.repos-toolbar-left').exists()).toBe(true)
  })

  it('prefixes every action of the selector with "Open in "', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.findAll('.repos-action-select option').map((option) => option.text())).toEqual([
      'Open in Github',
      'Open in Circleci',
      'Open in VSCode',
      'Open in All'
    ])
  })

  it('sends only structured-cloneable data to the main process, as IPC requires', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('.popover-menu-trigger').trigger('click')
    await wrapper.findAll('.filter-group-toggle')[1]!.trigger('click')
    await wrapper.findAll('.tri-state-checkbox')[0]!.trigger('click')
    await wrapper.findAll('.repos-preset-button')[0]!.trigger('click')
    await wrapper.find('.repos-preset-form input').setValue('Tag only')
    api.listPresets.mockResolvedValue([
      {
        name: 'Tag only',
        search: '',
        tagFilter: { backend: 'only' },
        orgFilter: {},
        viewId: 'default',
        attributes: ALL,
        sidebarEnabled: true,
        sidebarName: ''
      }
    ])
    await wrapper.find('.repos-preset-form').trigger('submit')
    await flushPromises()
    const filter = api.savePreset.mock.calls[0]![1]
    expect(() => structuredClone(filter)).not.toThrow()
    expect(structuredClone(filter).tagFilter).toEqual({ backend: 'only' })

    await wrapper.findAll('.repos-preset-button')[0]!.trigger('click') // Update preset
    await flushPromises()
    expect(() => structuredClone(api.updatePreset.mock.calls[0]![1])).not.toThrow()
  })

  it('offers the pull requests button only when logged in to GitHub', async () => {
    const loggedOut = await mountPage()
    expect(loggedOut.wrapper.find('.repository-card-action--pull-requests').exists()).toBe(false)
    api.getGithubLogin.mockResolvedValue({ loggedIn: true })
    const { wrapper } = await mountPage()
    expect(wrapper.findAll('.repository-card-action--pull-requests')).toHaveLength(3)
    // It comes after the All button.
    const labels = [...wrapper.find('.repository-card-actions').element.children].map((b) =>
      b.className.includes('pull-requests') ? 'PR' : b.textContent?.trim()
    )
    expect(labels).toEqual(['Github', 'Circleci', 'VSCode', 'All', 'PR'])
  })

  it('keeps the Repos page filters when a preset is visited, and gives them back on return', async () => {
    api.listPresets.mockResolvedValue([
      {
        name: 'Shop',
        search: '^shop-api',
        tagFilter: { backend: 'only' },
        orgFilter: { acme: 'exclude' },
        viewId: 'compact',
        attributes: { ...ALL, tags: false },
        sidebarEnabled: true,
        sidebarName: ''
      }
    ])
    const { wrapper, router } = await mountPage()
    // Filters set on the main page: a search, a tag, an attribute hidden.
    await wrapper.find('.repos-search-input').setValue('tools')
    await wrapper.find('.popover-menu-trigger').trigger('click')
    await wrapper.findAll('.filter-group-toggle')[1]!.trigger('click')
    await wrapper.findAll('.tri-state-checkbox')[0]!.trigger('click') // tag backend: only
    await wrapper.findAll('.popover-menu-trigger')[1]!.trigger('click')
    // (the Filter menu stays open in this DOM: its two groups come first)
    await wrapper.findAll('.filter-group-toggle')[3]!.trigger('click')
    await wrapper.find('input[aria-label="Show buttons"]').setValue(false)

    await router.push('/repos/preset/Shop')
    await flushPromises()
    const input = (): string =>
      (wrapper.find('.repos-search-input').element as HTMLInputElement).value
    expect(input()).toBe('^shop-api') // the preset's own state
    await wrapper.find('.repos-search-input').setValue('changed during the visit')

    await router.push('/repos')
    await flushPromises()
    expect(input()).toBe('tools') // the main page's, not the preset's, nor the visit's
    expect(wrapper.find('.repository-card-actions').exists()).toBe(false)
    const tagBoxes = wrapper.findAll('.tri-state-checkbox') // (the Filter menu is still open)
    expect(tagBoxes[0]!.attributes('data-state')).toBe('only')

    // The preset itself was not changed by the visit.
    await router.push('/repos/preset/Shop')
    await flushPromises()
    expect(input()).toBe('^shop-api')
  })

  it('keeps the Repos page filters when another page is visited and the page is mounted again', async () => {
    const first = await mountPage()
    await first.wrapper.find('.repos-search-input').setValue('shop-web')
    first.wrapper.unmount()
    const second = await mountPage()
    expect((second.wrapper.find('.repos-search-input').element as HTMLInputElement).value).toBe(
      'shop-web'
    )
  })
})
