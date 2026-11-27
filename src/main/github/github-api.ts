/**
 * The few GitHub REST API calls Grepo needs, with the saved token: the user's organizations and
 * teams, the repositories of a team, and a repository's CODEOWNERS file. The network is injected.
 *
 * @example
 * const api = new GithubApi(() => token, fetch)
 * const orgs = await api.listOrgs() // ['example']
 */

/** A failed GitHub call. */
export class GithubApiError extends Error {
  /** @param status - the HTTP status, 0 when GitHub couldn't be reached. */
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/** A team of the user. */
export interface ApiTeam {
  org: string
  slug: string
  name: string
}

/** A repository, as far as Grepo reads it. */
export interface ApiRepository {
  org: string
  name: string
  htmlUrl: string
  archived: boolean
}

/** A pull request, as far as Grepo reads it. */
export interface ApiPullRequest {
  number: number
  title: string
  url: string
  draft: boolean
}

const API_URL = 'https://api.github.com'
const PER_PAGE = 100
/** A safety limit on the pages of one list. */
const MAX_PAGES = 30
/** Where GitHub looks for CODEOWNERS, in order. */
const CODEOWNERS_PATHS = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']

/** An organization of the user. */
export interface ApiOrg {
  login: string
  id: number
}

export class GithubApi {
  /**
   * The ids of the organizations whose results GitHub left out of the lists read so far, because
   * the token isn't authorized for their SAML single sign-on (`X-GitHub-SSO: partial-results`).
   */
  readonly ssoOrganizationIds = new Set<number>()

  /**
   * @param token - gives the saved token (it is decrypted asynchronously), `null` when logged out.
   * @param fetchFn - the network.
   */
  constructor(
    private readonly token: () => string | null | Promise<string | null>,
    private readonly fetchFn: typeof fetch
  ) {}

  /**
   * Calls the API.
   *
   * @param path - the path, starting with `/`.
   * @param accept - the `Accept` header.
   * @returns the response; a 404 is returned, other failures throw.
   */
  private async request(path: string, accept = 'application/vnd.github+json'): Promise<Response> {
    const token = await this.token()
    if (!token) throw new GithubApiError('You are not logged in to GitHub.', 401)
    let response: Response
    try {
      response = await this.fetchFn(`${API_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: accept,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: AbortSignal.timeout(30_000)
      })
    } catch {
      throw new GithubApiError('GitHub could not be reached.', 0)
    }
    if (response.ok || response.status === 404) return response
    if (response.status === 401) throw new GithubApiError('GitHub refused the token.', 401)
    let detail = ''
    try {
      detail = ((await response.json()) as { message?: string }).message ?? ''
    } catch {
      // No details.
    }
    const hint =
      response.status === 403
        ? ' The token may lack a scope (read:org, repo), be missing the organization’s SSO authorization, or hit the rate limit.'
        : ''
    throw new GithubApiError(
      `GitHub answered ${response.status}${detail ? `: ${detail}` : ''}.${hint}`,
      response.status
    )
  }

  /**
   * Reads every page of a list.
   *
   * @param path - the list's path, with or without a query.
   */
  private async list<T>(path: string): Promise<T[]> {
    const items: T[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const separator = path.includes('?') ? '&' : '?'
      const response = await this.request(`${path}${separator}per_page=${PER_PAGE}&page=${page}`)
      if (response.status === 404) throw new GithubApiError('GitHub could not find it (404).', 404)
      this.noteSso(response)
      const batch = (await response.json()) as T[]
      items.push(...batch)
      if (batch.length < PER_PAGE) break
    }
    return items
  }

  /**
   * Remembers the organizations a response says it left out for lack of SSO authorization.
   *
   * @param response - a list's response.
   */
  private noteSso(response: Response): void {
    const header = response.headers.get('x-github-sso') ?? ''
    const ids = /organizations=([\d,]+)/.exec(header)?.[1]
    if (header.startsWith('partial-results') && ids) {
      for (const id of ids.split(',')) this.ssoOrganizationIds.add(Number(id))
    }
  }

  /** The user's organizations. */
  async listOrgs(): Promise<ApiOrg[]> {
    return (await this.list<ApiOrg>('/user/orgs')).map((org) => ({ login: org.login, id: org.id }))
  }

  /** The teams the user belongs to, in every organization (needs the `read:org` scope). */
  async listTeams(): Promise<ApiTeam[]> {
    const teams = await this.list<{ slug: string; name: string; organization: { login: string } }>(
      '/user/teams'
    )
    return teams.map((team) => ({
      org: team.organization.login,
      slug: team.slug,
      name: team.name
    }))
  }

  /**
   * The repositories a team has access to.
   *
   * @param org - the organization's login.
   * @param slug - the team's slug.
   */
  async listTeamRepositories(org: string, slug: string): Promise<ApiRepository[]> {
    const repositories = await this.list<{
      name: string
      html_url: string
      archived: boolean
      owner: { login: string }
    }>(`/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(slug)}/repos`)
    return repositories.map((repository) => ({
      org: repository.owner.login,
      name: repository.name,
      htmlUrl: repository.html_url,
      archived: repository.archived
    }))
  }

  /**
   * The open pull requests a user created in a repository, most recently updated first.
   *
   * @param org - the repository's organization.
   * @param name - the repository's name.
   * @param login - the author's login.
   */
  async myPullRequests(org: string, name: string, login: string): Promise<ApiPullRequest[]> {
    const query = encodeURIComponent(`repo:${org}/${name} is:pr is:open author:${login}`)
    const response = await this.request(
      `/search/issues?q=${query}&sort=updated&order=desc&per_page=50`
    )
    if (response.status === 404) throw new GithubApiError('GitHub could not find it (404).', 404)
    const body = (await response.json()) as {
      items?: Array<{ number: number; title: string; html_url: string; draft?: boolean }>
    }
    return (body.items ?? []).map((item) => ({
      number: item.number,
      title: item.title,
      url: item.html_url,
      draft: item.draft === true
    }))
  }

  /**
   * Reads a repository's CODEOWNERS file.
   *
   * @param org - the repository's organization.
   * @param name - the repository's name.
   * @returns the file's text, `null` when the repository has none.
   */
  async codeowners(org: string, name: string): Promise<string | null> {
    for (const path of CODEOWNERS_PATHS) {
      const response = await this.request(
        `/repos/${encodeURIComponent(org)}/${encodeURIComponent(name)}/contents/${path}`,
        'application/vnd.github.raw+json'
      )
      if (response.status !== 404) return response.text()
    }
    return null
  }
}
