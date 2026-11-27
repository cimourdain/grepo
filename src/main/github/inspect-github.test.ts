import { describe, expect, it, vi } from 'vitest'

import type { Repository } from '../../shared/repository'
import type { GithubApi } from './github-api'
import type { RemoteRepository } from '../../shared/github-orgs'
import { inspectAccount, inspectRepositories, markLocal } from './inspect-github'

/** Builds the API double. */
function fakeApi(overrides: Partial<Record<keyof GithubApi, unknown>>): GithubApi {
  return overrides as unknown as GithubApi
}

describe('inspectAccount', () => {
  it('groups the teams by organization, keeping organizations without a team', async () => {
    const api = fakeApi({
      listOrgs: async () => [
        { login: 'zeta', id: 2 },
        { login: 'Example', id: 1 }
      ],
      ssoOrganizationIds: new Set([2]),
      listTeams: async () => [
        { org: 'example', slug: 'web', name: 'Web' },
        { org: 'example', slug: 'api', name: 'API' }
      ]
    })
    const inspection = await inspectAccount(api, new Date('2026-01-01T00:00:00Z'))
    expect(inspection).toEqual({
      orgs: [
        {
          login: 'Example',
          teams: [
            { slug: 'api', name: 'API' },
            { slug: 'web', name: 'Web' }
          ]
        },
        { login: 'zeta', teams: [] }
      ],
      inspectedAt: '2026-01-01T00:00:00.000Z',
      ssoRequired: ['zeta']
    })
  })
})

describe('inspectRepositories', () => {
  const repository = (
    name: string,
    org = 'example',
    archived = false
  ): Record<string, unknown> => ({
    org,
    name,
    htmlUrl: `https://github.com/${org}/${name}`,
    archived
  })
  const local = (org: string, name: string, path: string): Repository =>
    ({ github: { host: 'github.com', org, name }, path }) as Repository

  it('keeps the repositories whose CODEOWNERS names an enabled team, marked cloned or missing', async () => {
    const owners: Record<string, string | null> = {
      'example/api': '* @example/web @someone',
      'example/site': '* @example/other',
      'example/old': '* @example/web',
      'example/none': null,
      'example/shared': '/a @example/web\n/b @example/api-team'
    }
    const listTeamRepositories = vi.fn(async (_org: string, slug: string) =>
      slug === 'web'
        ? [
            repository('api'),
            repository('site'),
            repository('old', 'example', true),
            repository('none'),
            repository('shared')
          ]
        : [repository('shared')]
    )
    const api = fakeApi({
      listTeamRepositories,
      codeowners: async (org: string, name: string) => owners[`${org}/${name}`] ?? null
    })
    const found = await inspectRepositories(
      api,
      ['example/web', 'example/api-team'],
      [local('Example', 'API', '/w/api')]
    )
    expect(found.map((r) => [r.fullName, r.status, r.localPath, r.teams])).toEqual([
      ['example/api', 'cloned', '/w/api', ['example/web']],
      ['example/shared', 'missing', '', ['example/api-team', 'example/web']]
    ])
    expect(listTeamRepositories).toHaveBeenCalledWith('example', 'api-team')
  })

  it('finds nothing without enabled teams', async () => {
    expect(await inspectRepositories(fakeApi({}), [], [])).toEqual([])
  })
})

describe('markLocal', () => {
  const remote = (
    name: string,
    status: 'cloned' | 'missing',
    localPath = ''
  ): RemoteRepository => ({
    org: 'example',
    name,
    fullName: `example/${name}`,
    htmlUrl: '',
    teams: [],
    status,
    localPath
  })
  const local = {
    github: { host: 'github.com', org: 'Example', name: 'API' },
    path: '/w/api'
  } as Repository

  it('brings a saved result up to date with the local repositories', () => {
    const marked = markLocal(
      [remote('api', 'missing'), remote('site', 'cloned', '/w/site')],
      [local],
      () => false
    )
    expect(marked.map((r) => [r.name, r.status, r.localPath])).toEqual([
      ['api', 'cloned', '/w/api'],
      ['site', 'missing', '']
    ])
  })

  it('keeps cloned a repository cloned elsewhere, while its folder is still a clone', () => {
    const elsewhere = remote('site', 'cloned', '/srv/code/site')
    expect(markLocal([elsewhere], [], (path) => path === '/srv/code/site')[0]).toMatchObject({
      status: 'cloned',
      localPath: '/srv/code/site'
    })
    expect(markLocal([elsewhere], [], () => false)[0]).toMatchObject({
      status: 'missing',
      localPath: ''
    })
  })
})
