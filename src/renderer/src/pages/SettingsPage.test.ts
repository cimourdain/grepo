import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import SettingsPage from './SettingsPage.vue'

/** Installs an API double answering what the Settings tabs read on opening. */
function installApi(): void {
  const answers: Record<string, unknown> = {
    getSettings: {
      configPath: '/c',
      defaultConfigPath: '/c',
      localReposPaths: ['/a'],
      defaultLocalReposPath: '/a',
      colorTheme: 'catppuccin-mocha'
    },
    getGithubLogin: { loggedIn: false },
    getRepoRules: { namingRules: [], tagRules: [], tagColors: {} },
    getRepoViews: {
      views: [{ id: 'd', name: 'D', fontSize: 16, minItemWidth: 300 }],
      defaultId: 'd'
    },
    listPresets: []
  }
  ;(window as unknown as { api: unknown }).api = new Proxy(
    {},
    { get: (_target, name: string) => vi.fn().mockResolvedValue(answers[name]) }
  )
}

describe('SettingsPage', () => {
  it('orders the tabs: General, Github, Rules, View, Theme, Import/Export', async () => {
    installApi()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/settings/:tab?', component: SettingsPage }]
    })
    await router.push('/settings')
    const wrapper = mount(SettingsPage, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      'General',
      'Github',
      'Rules',
      'View',
      'Theme',
      'Import/Export'
    ])
  })

  it('has no application name and version footer (they are on the About page)', async () => {
    installApi()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/settings/:tab?', component: SettingsPage }]
    })
    await router.push('/settings')
    const wrapper = mount(SettingsPage, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.text()).not.toContain(`Grepo ${__APP_VERSION__}`)
    expect(wrapper.find('.settings-version').exists()).toBe(false)
  })

  it('explains the naming rules as the displayed repository name, not as a "clean name"', async () => {
    installApi()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/settings/:tab?', component: SettingsPage }]
    })
    await router.push('/settings/rules')
    const wrapper = mount(SettingsPage, { global: { plugins: [router] } })
    await flushPromises()
    const section = wrapper.find('section[aria-label="Naming rules"]')
    expect(section.text()).toContain('repository name displayed in the repositories page')
    expect(section.text().toLowerCase()).not.toContain('clean name')
  })
})
