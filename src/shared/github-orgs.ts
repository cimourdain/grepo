/**
 * What Grepo knows of the logged-in GitHub account's organizations and teams, which of them the
 * user enabled, and the repositories found through them: the shared types and the pure helpers.
 *
 * @example
 * parseCodeowners('*.js @example/web-team @alice\n# comment') // ['@example/web-team', '@alice']
 * teamKey('Example', 'Web-Team') // 'example/web-team'
 */

/** A team of an organization the user belongs to. */
export interface GithubTeam {
  slug: string
  name: string
}

/** An organization of the user, with the user's teams in it. */
export interface GithubOrg {
  login: string
  teams: GithubTeam[]
}

/** What the last inspection of the account found. */
export interface GithubInspection {
  orgs: GithubOrg[]
  /** When it was made (ISO 8601). */
  inspectedAt: string
  /**
   * The organizations GitHub left teams out of, because the token isn't authorized for their SAML
   * single sign-on: the teams shown for them are incomplete.
   */
  ssoRequired?: string[]
}

/** What the user turned off; everything else is enabled. Keys are lower case. */
export interface GithubSelection {
  disabledOrgs: string[]
  /** Teams as `org/slug` (see `teamKey`). */
  disabledTeams: string[]
}

/** The inspection and the selection, as Settings shows them. */
export interface GithubOrgsView {
  /** `null` before the first inspection. */
  inspection: GithubInspection | null
  selection: GithubSelection
}

/** The answer of a call that reads GitHub. */
export type GithubOrgsResult =
  { success: true; view: GithubOrgsView } | { success: false; message: string }

/** A repository some enabled team owns (is a code owner of), and whether it is on this computer. */
export interface RemoteRepository {
  org: string
  name: string
  /** `org/name`. */
  fullName: string
  htmlUrl: string
  /** The enabled teams (`org/slug`) that are code owners of it. */
  teams: string[]
  status: 'cloned' | 'missing'
  /** Where it is cloned; empty when missing. */
  localPath: string
}

/** The answer of the repositories inspection. */
export type GithubRepositoriesResult =
  | { success: true; repositories: RemoteRepository[]; inspectedAt: string }
  | { success: false; message: string }

/** An open pull request of the user. */
export interface PullRequest {
  number: number
  title: string
  /** The pull request's web address. */
  url: string
  draft: boolean
}

/** The answer of the pull requests lookup. */
export type PullRequestsResult =
  { success: true; pullRequests: PullRequest[] } | { success: false; message: string }

/** The answer of a clone. */
export type CloneResult = { success: true; path: string } | { success: false; message: string }

/** What a user without choices has selected: everything. */
export const NO_DISABLED: Readonly<GithubSelection> = { disabledOrgs: [], disabledTeams: [] }

/**
 * Writes the key of a team: `org/slug`, lower case (GitHub names are case-insensitive).
 *
 * @param org - the organization's login.
 * @param slug - the team's slug.
 */
export function teamKey(org: string, slug: string): string {
  return `${org}/${slug}`.toLowerCase()
}

/**
 * Normalizes a selection read from a file or sent by the page.
 *
 * @param value - the value (untrusted).
 */
export function parseSelection(value: unknown): GithubSelection {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const strings = (list: unknown): string[] =>
    Array.isArray(list)
      ? [
          ...new Set(
            list
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.toLowerCase())
          )
        ]
      : []
  return { disabledOrgs: strings(raw.disabledOrgs), disabledTeams: strings(raw.disabledTeams) }
}

/**
 * Lists the teams (`org/slug`) of an inspection that are enabled: a team of a disabled org is not.
 *
 * @param inspection - what was inspected.
 * @param selection - what the user turned off.
 */
export function enabledTeams(inspection: GithubInspection, selection: GithubSelection): string[] {
  const keys: string[] = []
  for (const org of inspection.orgs) {
    if (selection.disabledOrgs.includes(org.login.toLowerCase())) continue
    for (const team of org.teams) {
      const key = teamKey(org.login, team.slug)
      if (!selection.disabledTeams.includes(key)) keys.push(key)
    }
  }
  return keys
}

/**
 * Lists the owners a CODEOWNERS file names: the `@user`, `@org/team` and e-mail words after each
 * pattern, lower case, without duplicates.
 *
 * @param text - the file's content.
 */
export function parseCodeowners(text: string): string[] {
  const owners = new Set<string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/(^|\s)#.*$/, '').trim()
    if (line === '') continue
    // The first word is the file pattern; the others are owners.
    for (const word of line.split(/\s+/).slice(1)) owners.add(word.toLowerCase())
  }
  return [...owners]
}
