import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Repository } from '../../../shared/repository'
import RepositoryCard from './RepositoryCard.vue'

const repository: Repository = {
  folderName: 'api',
  cleanName: 'Api',
  cleanParts: [{ type: 'text', text: 'Api' }],
  tags: [],
  realName: 'example/api',
  path: '/w/api',
  remoteUrl: null,
  github: { host: 'github.com', org: 'example', name: 'api' },
  hasCircleci: false
}

const api = { listMyPullRequests: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as unknown as { api: unknown }).api = api
})

/** Mounts the card. */
function card(props: Record<string, unknown> = {}): ReturnType<typeof mount> {
  return mount(RepositoryCard, { props: { repository, selected: false, ...props } })
}

describe('RepositoryCard pull requests', () => {
  it('has no pull requests button when logged out, without a GitHub remote, or with buttons hidden', () => {
    expect(card().find('.repository-card-action--pull-requests').exists()).toBe(false)
    expect(
      card({ githubLoggedIn: true, repository: { ...repository, github: null } })
        .find('.repository-card-action--pull-requests')
        .exists()
    ).toBe(false)
    expect(
      card({
        githubLoggedIn: true,
        attributes: { org: true, name: true, tags: true, buttons: false }
      })
        .find('.repository-card-action--pull-requests')
        .exists()
    ).toBe(false)
  })

  it('reads my pull requests and links to them, then hides them on a second click', async () => {
    api.listMyPullRequests.mockResolvedValue({
      success: true,
      pullRequests: [
        { number: 7, title: 'Fix it', url: 'https://github.com/example/api/pull/7', draft: true },
        { number: 3, title: 'Add it', url: 'https://github.com/example/api/pull/3', draft: false }
      ]
    })
    const wrapper = card({ githubLoggedIn: true })
    const button = wrapper.find('.repository-card-action--pull-requests')
    expect(button.attributes('aria-label')).toBe('My pull requests')
    expect(button.find('svg').exists()).toBe(true)
    await button.trigger('click')
    await flushPromises()
    expect(api.listMyPullRequests).toHaveBeenCalledWith('example', 'api')
    const links = wrapper.findAll('.repository-card-pr-list a')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      'https://github.com/example/api/pull/7',
      'https://github.com/example/api/pull/3'
    ])
    expect(links[0]!.text()).toBe('#7 Fix it')
    expect(links[0]!.attributes('target')).toBe('_blank')
    expect(wrapper.find('.repository-card-pr-draft').text()).toBe('draft')

    await button.trigger('click')
    expect(wrapper.find('.repository-card-pull-requests').exists()).toBe(false)
  })

  it('says when there is none, and why a lookup failed', async () => {
    api.listMyPullRequests.mockResolvedValueOnce({ success: true, pullRequests: [] })
    const wrapper = card({ githubLoggedIn: true })
    await wrapper.find('.repository-card-action--pull-requests').trigger('click')
    await flushPromises()
    expect(wrapper.find('.repository-card-pr-message').text()).toBe('No open pull request by you.')

    await wrapper.find('.repository-card-action--pull-requests').trigger('click')
    api.listMyPullRequests.mockResolvedValueOnce({
      success: false,
      message: 'GitHub refused the token.'
    })
    await wrapper.find('.repository-card-action--pull-requests').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('GitHub refused the token.')
  })
})
