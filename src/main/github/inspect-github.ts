/**
 * The two inspections of the GitHub tab:
 *
 * - `inspectAccount`: the user's organizations and the user's teams in each;
 * - `inspectRepositories`: the repositories of which an enabled team is a code owner, each marked
 *   cloned (a local repository has its GitHub remote) or missing. A team that owns code in a
 *   repository must have access to it, so the repositories of the enabled teams are the
 *   candidates, and each one's CODEOWNERS file tells whether a team is named in it.
 *
 * @example
 * const inspection = await inspectAccount(api)
 * const repositories = await inspectRepositories(api, enabledTeams(inspection, selection), local)
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  parseCodeowners,
  type GithubInspection,
  type RemoteRepository
} from '../../shared/github-orgs'
import type { Repository } from '../../shared/repository'
import type { GithubApi } from './github-api'

/** How many CODEOWNERS files are read at once. */
const CONCURRENCY = 6

/**
 * Maps a list with a limited number of calls in flight.
 *
 * @param items - the items.
 * @param limit - the number of calls at once.
 * @param work - what to do with an item.
 */
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await work(items[index]!)
    }
  })
  await Promise.all(runners)
  return results
}

/**
 * Reads the user's organizations and teams.
 *
 * @param api - the GitHub API.
 * @param now - the current time.
 */
export async function inspectAccount(
  api: GithubApi,
  now: Date = new Date()
): Promise<GithubInspection> {
  const [apiOrgs, teams] = await Promise.all([api.listOrgs(), api.listTeams()])
  const orgs = new Map<string, GithubInspection['orgs'][number]>()
  for (const { login } of apiOrgs) orgs.set(login.toLowerCase(), { login, teams: [] })
  for (const team of teams) {
    const key = team.org.toLowerCase()
    if (!orgs.has(key)) orgs.set(key, { login: team.org, teams: [] })
    orgs.get(key)!.teams.push({ slug: team.slug, name: team.name })
  }
  const sorted = [...orgs.values()].sort((a, b) => a.login.localeCompare(b.login))
  for (const org of sorted) org.teams.sort((a, b) => a.name.localeCompare(b.name))
  // GitHub hides what the token can't see of a SAML SSO organization instead of failing.
  const ssoRequired = apiOrgs
    .filter((org) => api.ssoOrganizationIds.has(org.id))
    .map((org) => org.login)
    .sort((a, b) => a.localeCompare(b))
  return { orgs: sorted, inspectedAt: now.toISOString(), ssoRequired }
}

/**
 * Marks repositories cloned or missing from the local repositories: used for a fresh inspection
 * and to bring a saved one up to date.
 *
 * @param repositories - the repositories (not changed).
 * @param local - the local repositories.
 * @param isClone - tells whether a folder is still a git clone: a repository cloned outside the
 * local repositories paths (into a folder chosen at the clone) stays cloned while it is.
 * @returns copies with their status and local path set.
 */
export function markLocal(
  repositories: readonly RemoteRepository[],
  local: readonly Repository[],
  isClone: (path: string) => boolean = (path) => existsSync(join(path, '.git'))
): RemoteRepository[] {
  const byName = new Map<string, Repository>()
  for (const repository of local) {
    if (repository.github) {
      byName.set(`${repository.github.org}/${repository.github.name}`.toLowerCase(), repository)
    }
  }
  return repositories.map((repository) => {
    const clone = byName.get(repository.fullName.toLowerCase())
    if (clone) return { ...repository, status: 'cloned', localPath: clone.path }
    if (repository.localPath !== '' && isClone(repository.localPath)) {
      return { ...repository, status: 'cloned' }
    }
    return { ...repository, status: 'missing', localPath: '' }
  })
}

/**
 * Finds the repositories an enabled team is a code owner of.
 *
 * @param api - the GitHub API.
 * @param teams - the enabled teams, as `org/slug` in lower case.
 * @param local - the local repositories.
 * @returns the repositories, sorted by name.
 */
export async function inspectRepositories(
  api: GithubApi,
  teams: readonly string[],
  local: readonly Repository[]
): Promise<RemoteRepository[]> {
  // The candidates: the repositories each team has access to.
  const candidates = new Map<
    string,
    { org: string; name: string; htmlUrl: string; teams: Set<string> }
  >()
  const lists = await mapLimit(teams, 3, async (team) => {
    const [org, slug] = [team.slice(0, team.indexOf('/')), team.slice(team.indexOf('/') + 1)]
    return { team, repositories: await api.listTeamRepositories(org, slug) }
  })
  for (const { team, repositories } of lists) {
    for (const repository of repositories) {
      if (repository.archived) continue
      const key = `${repository.org}/${repository.name}`.toLowerCase()
      const entry = candidates.get(key) ?? {
        org: repository.org,
        name: repository.name,
        htmlUrl: repository.htmlUrl,
        teams: new Set<string>()
      }
      entry.teams.add(team)
      candidates.set(key, entry)
    }
  }

  // Keep those whose CODEOWNERS names one of the teams that can see it.
  const checked = await mapLimit([...candidates.entries()], CONCURRENCY, async ([, candidate]) => {
    const text = await api.codeowners(candidate.org, candidate.name)
    if (text === null) return null
    const owners = new Set(parseCodeowners(text))
    const owning = [...candidate.teams].filter((team) => owners.has(`@${team}`))
    if (owning.length === 0) return null
    const repository: RemoteRepository = {
      org: candidate.org,
      name: candidate.name,
      fullName: `${candidate.org}/${candidate.name}`,
      htmlUrl: candidate.htmlUrl,
      teams: owning.sort(),
      status: 'missing',
      localPath: ''
    }
    return repository
  })
  const found = checked
    .filter((repository): repository is RemoteRepository => repository !== null)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
  return markLocal(found, local)
}
