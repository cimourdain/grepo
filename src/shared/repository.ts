/**
 * What the app knows of a local repository, and the pure helpers on it: its clean name, the
 * GitHub and CircleCI addresses built from its git remote, and the regular-expression filter of
 * the Repos page.
 *
 * @example
 * cleanRepositoryName('shop-checkout_payment') // 'Shop Checkout Payment'
 * parseGithubRemote('git@github.com:org/repo.git') // { host: 'github.com', org: 'org', name: 'repo' }
 * filterRepositories(repositories, '^shop-.*-mfe$').repositories
 */
import type { NamePart } from './repo-rules'

/** The GitHub repository a git remote points to. */
export interface GithubRemote {
  host: string
  org: string
  name: string
}

/** A repository found in the local repositories folder. */
export interface Repository {
  /** The repository's folder name. */
  folderName: string
  /** The clean name as text (images left out), built by the naming rules of Settings → Repos. */
  cleanName: string
  /** The clean name as the grid's title shows it: texts and images. */
  cleanParts: NamePart[]
  /** The tags the tag rules of Settings → Repos give. */
  tags: string[]
  /** The repository's real name: `org/name` from its GitHub remote, else its folder name. */
  realName: string
  /** The repository's absolute path. */
  path: string
  /** The `origin` remote's URL, `null` when there is none. */
  remoteUrl: string | null
  /** The GitHub repository of the remote, `null` when it isn't one. */
  github: GithubRemote | null
  /** Whether a `.circleci/` folder is at the repository's root. */
  hasCircleci: boolean
}

/** The repositories saved by the last inspection. */
export interface RepositoryInventory {
  repositories: Repository[]
  /** The folder inspected; empty before the first inspection. */
  scannedPaths: string[]
  /** When it was inspected (ISO 8601); empty before the first inspection. */
  scannedAt: string
}

/**
 * Writes the clean name of a repository: dashes and underscores become spaces, and each word
 * starts with a capital letter.
 *
 * @param folderName - the repository's folder name.
 * @returns the clean name.
 */
export function cleanRepositoryName(folderName: string): string {
  return folderName
    .split(/[-_\s]+/)
    .filter((word) => word !== '')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Reads a git remote URL as a GitHub repository.
 *
 * @param url - the remote's URL: `git@github.com:org/repo.git`, `https://github.com/org/repo`,
 * `ssh://git@github.com/org/repo.git`…
 * @returns the repository, `null` when the remote isn't on a GitHub host.
 */
export function parseGithubRemote(url: string): GithubRemote | null {
  const scp = /^(?:[\w.-]+@)?([\w.-]+):(?!\/\/)([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(url.trim())
  const standard =
    /^(?:https?|ssh|git):\/\/(?:[^@/]+@)?([\w.-]+)(?::\d+)?\/([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(
      url.trim()
    )
  const match = standard ?? scp
  if (!match) return null
  const [, host, org, name] = match
  if (!host || !org || !name || !host.toLowerCase().includes('github')) return null
  return { host: host.toLowerCase(), org, name }
}

/**
 * Builds the web address of a GitHub repository.
 *
 * @param github - the repository.
 */
export function githubUrlOf(github: GithubRemote): string {
  return `https://${github.host}/${github.org}/${github.name}`
}

/**
 * Builds the CircleCI pipelines address of a GitHub repository.
 *
 * @param github - the repository.
 */
export function circleciUrlOf(github: GithubRemote): string {
  return `https://app.circleci.com/pipelines/github/${github.org}/${github.name}`
}

/** What the filter made of a search text. */
export interface RepositoryFilterResult {
  repositories: Repository[]
  /** Why the text isn't a valid regular expression; empty when it is (or is empty). */
  error: string
}

/**
 * Filters the repositories by a regular expression, tested case-insensitively on the clean name,
 * the real name and the folder name. An empty text keeps them all; an invalid expression keeps
 * them all and reports its error.
 *
 * @param repositories - the repositories.
 * @param search - the text typed, a regular expression.
 */
export function filterRepositories(
  repositories: readonly Repository[],
  search: string
): RepositoryFilterResult {
  const text = search.trim()
  if (text === '') return { repositories: [...repositories], error: '' }
  let pattern: RegExp
  try {
    pattern = new RegExp(text, 'i')
  } catch (error) {
    return {
      repositories: [...repositories],
      error: error instanceof Error ? error.message : 'Invalid regular expression'
    }
  }
  return {
    repositories: repositories.filter((repository) =>
      [repository.cleanName, repository.realName, repository.folderName].some((name) =>
        pattern.test(name)
      )
    ),
    error: ''
  }
}
