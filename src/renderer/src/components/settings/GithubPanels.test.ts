import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import GithubOrgsPanel from './GithubOrgsPanel.vue'
import GithubReposPanel from './GithubReposPanel.vue'

const api = {
  getGithubOrgs: vi.fn(),
  inspectGithubOrgs: vi.fn(),
  setGithubSelection: vi.fn(),
  getGithubRepositories: vi.fn(),
  inspectGithubRepositories: vi.fn(),
  cloneGithubRepository: vi.fn(),
  getSettings: vi.fn()
}

const inspection = {
  orgs: [
    {
      login: 'example',
      teams: [
        { slug: 'web', name: 'Web' },
        { slug: 'api', name: 'API' }
      ]
    }
  ],
  inspectedAt: '2026-01-01T00:00:00Z'
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getSettings.mockResolvedValue({ localReposPaths: ['/home/me/code', '/srv/code'] })
  api.getGithubRepositories.mockResolvedValue({ success: true, repositories: [], inspectedAt: '' })
  api.setGithubSelection.mockResolvedValue({ success: true })
  ;(window as unknown as { api: unknown }).api = api
})

describe('GithubOrgsPanel', () => {
  it('shows orgs and teams as checkboxes, and saves what is disabled', async () => {
    api.getGithubOrgs.mockResolvedValue({
      success: true,
      view: { inspection, selection: { disabledOrgs: [], disabledTeams: [] } }
    })
    const wrapper = mount(GithubOrgsPanel)
    await flushPromises()
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(3)
    expect(boxes.every((box) => (box.element as HTMLInputElement).checked)).toBe(true)

    await wrapper.find('input[aria-label="Enable the team example/api"]').setValue(false)
    expect(api.setGithubSelection).toHaveBeenLastCalledWith({
      disabledOrgs: [],
      disabledTeams: ['example/api']
    })
    expect(wrapper.emitted('change')).toHaveLength(1)
    // What crosses the IPC boundary must be structured-cloneable (no reactive proxy).
    expect(() => structuredClone(api.setGithubSelection.mock.calls[0]![0])).not.toThrow()

    await wrapper.find('input[aria-label="Enable the organization example"]').setValue(false)
    expect(api.setGithubSelection).toHaveBeenLastCalledWith({
      disabledOrgs: ['example'],
      disabledTeams: ['example/api']
    })
    // The teams of a disabled organization can't be toggled.
    expect(
      wrapper.find('input[aria-label="Enable the team example/web"]').attributes('disabled')
    ).toBeDefined()
  })

  it('inspects the account by itself the first time, and says why it failed', async () => {
    api.getGithubOrgs.mockResolvedValue({
      success: true,
      view: { inspection: null, selection: { disabledOrgs: [], disabledTeams: [] } }
    })
    api.inspectGithubOrgs.mockResolvedValue({
      success: false,
      message: 'GitHub refused the token.'
    })
    const wrapper = mount(GithubOrgsPanel)
    await flushPromises()
    expect(api.inspectGithubOrgs).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="alert"]').text()).toBe('GitHub refused the token.')
  })
})

describe('GithubReposPanel', () => {
  const repositories = [
    {
      org: 'example',
      name: 'api',
      fullName: 'example/api',
      htmlUrl: 'https://github.com/example/api',
      teams: ['example/web'],
      status: 'cloned',
      localPath: '/home/me/code/api'
    },
    {
      org: 'example',
      name: 'site',
      fullName: 'example/site',
      htmlUrl: 'https://github.com/example/site',
      teams: ['example/web'],
      status: 'missing',
      localPath: ''
    }
  ]

  it('lists the repositories as cloned or missing, with a Clone button for missing ones', async () => {
    api.inspectGithubRepositories.mockResolvedValue({
      success: true,
      repositories: structuredClone(repositories),
      inspectedAt: ''
    })
    const wrapper = mount(GithubReposPanel)
    await flushPromises()
    await wrapper.find('.github-repos-actions button').trigger('click')
    await flushPromises()
    const rows = wrapper.findAll('.remote')
    expect(rows.map((row) => row.find('.remote-status').text())).toEqual(['cloned', 'missing'])
    expect(rows[0]!.find('.remote-clone').exists()).toBe(false)
    expect(rows[0]!.text()).toContain('/home/me/code/api')
    expect(rows[1]!.find('.remote-clone').exists()).toBe(true)
    expect(wrapper.text()).toContain('2 found · 1 missing')
  })

  it('has a clone folder for each missing repository, and clones into the chosen one', async () => {
    const two = structuredClone(repositories)
    two.push({ ...two[1]!, name: 'web', fullName: 'example/web' })
    api.inspectGithubRepositories.mockResolvedValue({
      success: true,
      repositories: two,
      inspectedAt: ''
    })
    api.cloneGithubRepository.mockResolvedValue({ success: true, path: '/srv/code/site' })
    const wrapper = mount(GithubReposPanel)
    await flushPromises()
    await wrapper.find('.github-repos-actions button').trigger('click')
    await flushPromises()
    const siteField = wrapper.find('input[aria-label="Clone example/site into"]')
    expect(siteField.attributes('placeholder')).toBe('/home/me/code')
    expect(wrapper.find('input[aria-label="Clone example/api into"]').exists()).toBe(false) // cloned
    expect(wrapper.findAll('#github-clone-paths option').map((o) => o.attributes('value'))).toEqual(
      ['/home/me/code', '/srv/code']
    )
    await siteField.setValue('/srv/code')
    await wrapper.find('button[aria-label="Clone example/site"]').trigger('click')
    await flushPromises()
    expect(api.cloneGithubRepository).toHaveBeenCalledWith('example', 'site', '/srv/code')
    expect(wrapper.findAll('.remote')[1]!.find('.remote-status').text()).toBe('cloned')
    expect(wrapper.findAll('.remote')[1]!.text()).toContain('/srv/code/site')

    // Another repository has its own folder: empty means the default.
    await wrapper.find('button[aria-label="Clone example/web"]').trigger('click')
    await flushPromises()
    expect(api.cloneGithubRepository).toHaveBeenLastCalledWith('example', 'web', '')
  })

  it('shows the saved result of the last inspection when it opens, without asking GitHub', async () => {
    api.getGithubRepositories.mockResolvedValue({
      success: true,
      repositories: structuredClone(repositories),
      inspectedAt: '2026-01-01T10:00:00Z'
    })
    const wrapper = mount(GithubReposPanel)
    await flushPromises()
    expect(wrapper.findAll('.remote')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 found · 1 missing · inspected')
    expect(api.inspectGithubRepositories).not.toHaveBeenCalled()
  })

  it('shows a clone failure under the repository', async () => {
    api.inspectGithubRepositories.mockResolvedValue({
      success: true,
      repositories: structuredClone(repositories),
      inspectedAt: ''
    })
    api.cloneGithubRepository.mockResolvedValue({ success: false, message: 'Permission denied.' })
    const wrapper = mount(GithubReposPanel)
    await flushPromises()
    await wrapper.find('.github-repos-actions button').trigger('click')
    await flushPromises()
    await wrapper.find('button[aria-label="Clone example/site"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.remote-error').text()).toBe('Permission denied.')
    expect(wrapper.findAll('.remote')[1]!.find('.remote-status').text()).toBe('missing')
  })

  it('says why an inspection failed', async () => {
    api.inspectGithubRepositories.mockResolvedValue({
      success: false,
      message: 'No team is enabled.'
    })
    const wrapper = mount(GithubReposPanel)
    await flushPromises()
    await wrapper.find('.github-repos-actions button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('No team is enabled.')
  })
})

describe('GithubOrgsPanel SSO', () => {
  it('warns when GitHub hid the teams of an organization for lack of SSO authorization', async () => {
    api.getGithubOrgs.mockResolvedValue({
      success: true,
      view: {
        inspection: {
          orgs: [{ login: 'example', teams: [] }],
          inspectedAt: '',
          ssoRequired: ['example']
        },
        selection: { disabledOrgs: [], disabledTeams: [] }
      }
    })
    const wrapper = mount(GithubOrgsPanel)
    await flushPromises()
    expect(wrapper.find('.sso-warning').text()).toMatch(
      /example.*SAML single sign-on.*Configure SSO/s
    )
    expect(wrapper.find('.org-no-teams').text()).toMatch(/Teams hidden/)
  })
})
