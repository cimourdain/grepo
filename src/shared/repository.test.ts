import { describe, expect, it } from 'vitest'

import {
  circleciUrlOf,
  cleanRepositoryName,
  filterRepositories,
  githubUrlOf,
  parseGithubRemote,
  type Repository
} from './repository'

/** Builds a repository from its folder name. */
function repo(folderName: string, realName = folderName): Repository {
  return {
    folderName,
    cleanName: cleanRepositoryName(folderName),
    cleanParts: [],
    tags: [],
    realName,
    path: `/w/${folderName}`,
    remoteUrl: null,
    github: null,
    hasCircleci: false
  }
}

describe('cleanRepositoryName', () => {
  it('drops dashes and underscores and capitalizes words', () => {
    expect(cleanRepositoryName('shop-checkout_payment--api')).toBe('Shop Checkout Payment Api')
  })
})

describe('parseGithubRemote', () => {
  it.each([
    ['git@github.com:org/repo.git', 'github.com', 'org', 'repo'],
    ['https://github.com/org/repo', 'github.com', 'org', 'repo'],
    ['https://user:tok@github.com/org/repo.git', 'github.com', 'org', 'repo'],
    ['ssh://git@github.com:22/org/re.po.git', 'github.com', 'org', 're.po'],
    ['git@github.mycorp.com:org/repo.git', 'github.mycorp.com', 'org', 'repo']
  ])('reads %s', (url, host, org, name) => {
    expect(parseGithubRemote(url)).toEqual({ host, org, name })
  })

  it('refuses other hosts and non-remotes', () => {
    expect(parseGithubRemote('git@gitlab.com:org/repo.git')).toBeNull()
    expect(parseGithubRemote('/srv/git/repo.git')).toBeNull()
    expect(parseGithubRemote('')).toBeNull()
  })

  it('builds the GitHub and CircleCI addresses', () => {
    const github = { host: 'github.com', org: 'example', name: 'api' }
    expect(githubUrlOf(github)).toBe('https://github.com/example/api')
    expect(circleciUrlOf(github)).toBe('https://app.circleci.com/pipelines/github/example/api')
  })
})

describe('filterRepositories', () => {
  const repositories = [
    repo('shop-web'),
    repo('shop-api'),
    repo('other_tool', 'example/other-tool')
  ]

  it('keeps everything for an empty search', () => {
    expect(filterRepositories(repositories, '  ').repositories).toHaveLength(3)
  })

  it('understands regular expressions, case-insensitively', () => {
    expect(
      filterRepositories(repositories, '^SHOP-(web|api)$').repositories.map((r) => r.folderName)
    ).toEqual(['shop-web', 'shop-api'])
  })

  it('matches the clean and the real name too', () => {
    expect(filterRepositories(repositories, 'other tool').repositories).toHaveLength(1)
    expect(filterRepositories(repositories, 'example/').repositories).toHaveLength(1)
  })

  it('reports an invalid expression and filters nothing', () => {
    const result = filterRepositories(repositories, '(')
    expect(result.error).not.toBe('')
    expect(result.repositories).toHaveLength(3)
  })
})
