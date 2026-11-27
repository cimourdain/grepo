import { describe, expect, it, vi } from 'vitest'

import { GithubApi, GithubApiError } from './github-api'

/** A JSON answer. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('GithubApi', () => {
  it('reads every page of a list, with the token', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ login: `org${i}`, id: i }))
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(full))
      .mockResolvedValueOnce(json([{ login: 'last', id: 100 }]))
    const orgs = await new GithubApi(() => 'tok', fetchFn).listOrgs()
    expect(orgs).toHaveLength(101)
    expect(fetchFn.mock.calls[0]![0]).toBe('https://api.github.com/user/orgs?per_page=100&page=1')
    expect(fetchFn.mock.calls[1]![0]).toContain('page=2')
    expect(fetchFn.mock.calls[0]![1].headers.Authorization).toBe('Bearer tok')
  })

  it('notes the organizations GitHub left out for lack of SSO authorization', async () => {
    const answer = new Response('[]', {
      status: 200,
      headers: { 'X-GitHub-SSO': 'partial-results; organizations=12,34' }
    })
    const api = new GithubApi(() => 't', vi.fn().mockResolvedValue(answer))
    await api.listTeams()
    expect([...api.ssoOrganizationIds]).toEqual([12, 34])
  })

  it('reads the teams with their organization', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(json([{ slug: 'web', name: 'Web', organization: { login: 'example' } }]))
    expect(await new GithubApi(() => 't', fetchFn).listTeams()).toEqual([
      { org: 'example', slug: 'web', name: 'Web' }
    ])
  })

  it('reads the repositories of a team', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      json([
        {
          name: 'api',
          html_url: 'https://github.com/example/api',
          archived: false,
          owner: { login: 'example' }
        }
      ])
    )
    const repositories = await new GithubApi(() => 't', fetchFn).listTeamRepositories(
      'example',
      'web'
    )
    expect(fetchFn.mock.calls[0]![0]).toContain('/orgs/example/teams/web/repos')
    expect(repositories).toEqual([
      { org: 'example', name: 'api', htmlUrl: 'https://github.com/example/api', archived: false }
    ])
  })

  it('searches the open pull requests the user created in a repository', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      json({
        items: [
          {
            number: 7,
            title: 'Fix it',
            html_url: 'https://github.com/example/api/pull/7',
            draft: true
          },
          { number: 3, title: 'Add it', html_url: 'https://github.com/example/api/pull/3' }
        ]
      })
    )
    const pullRequests = await new GithubApi(() => 't', fetchFn).myPullRequests(
      'example',
      'api',
      'me'
    )
    const url = decodeURIComponent(String(fetchFn.mock.calls[0]![0]))
    expect(url).toContain('/search/issues?q=repo:example/api is:pr is:open author:me')
    expect(pullRequests).toEqual([
      { number: 7, title: 'Fix it', url: 'https://github.com/example/api/pull/7', draft: true },
      { number: 3, title: 'Add it', url: 'https://github.com/example/api/pull/3', draft: false }
    ])
  })

  it('looks for CODEOWNERS in GitHub’s order, and returns null without one', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('* @example/web', { status: 200 }))
    expect(await new GithubApi(() => 't', fetchFn).codeowners('example', 'api')).toBe(
      '* @example/web'
    )
    expect(fetchFn.mock.calls[1]![0]).toContain('/contents/CODEOWNERS')

    const none = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    expect(await new GithubApi(() => 't', none).codeowners('example', 'api')).toBeNull()
    expect(none).toHaveBeenCalledTimes(3)
  })

  it('explains failures', async () => {
    await expect(new GithubApi(() => null, vi.fn()).listOrgs()).rejects.toThrow(/not logged in/)
    await expect(
      new GithubApi(() => 't', vi.fn().mockResolvedValue(json({}, 401))).listOrgs()
    ).rejects.toThrow(/refused the token/)
    const forbidden = new GithubApi(
      () => 't',
      vi.fn().mockResolvedValue(json({ message: 'Resource protected by SAML' }, 403))
    )
    await expect(forbidden.listTeams()).rejects.toThrow(/SAML.*scope/s)
    await expect(
      new GithubApi(() => 't', vi.fn().mockRejectedValue(new Error('offline'))).listOrgs()
    ).rejects.toBeInstanceOf(GithubApiError)
  })
})
