/**
 * Logs in to GitHub with a personal access token, to use the GitHub API.
 *
 * The token is checked against `GET /user`, then saved in `github-auth.json` of the configuration
 * folder, encrypted with the system's keyring (Electron's `safeStorage`) when there is one; else
 * it is kept in the file alone, readable by its owner only (mode 0600), and the page says so.
 * The token never leaves the main process: the page only gets the account's name.
 *
 * What encrypts and what fetches is injected, for tests.
 *
 * @example
 * const result = await store.login('ghp_…')
 */
import { LOGGED_OUT, type GithubLoginResult, type GithubLoginState } from '../../shared/github-auth'
import type { ConfigLocation } from '../config/config-location'
import { readJsonFile, writeJsonFile } from '../config/json-file'

/** The system pieces the store needs. */
export interface GithubAuthEnvironment {
  /** Whether the system's keyring can encrypt (Electron's asynchronous `safeStorage` API). */
  isEncryptionAvailable: () => Promise<boolean>
  encrypt: (text: string) => Promise<Buffer>
  /** `shouldReEncrypt`: the keyring's key changed, so the token should be saved again. */
  decrypt: (data: Buffer) => Promise<{ result: string; shouldReEncrypt: boolean }>
  fetch: typeof fetch
}

/** What is saved. */
interface SavedAuth {
  login: string
  name: string
  encrypted: boolean
  /** The token: base64 of the encrypted bytes, or the token itself when not encrypted. */
  token: string
}

/** The GitHub API's address. */
const API_URL = 'https://api.github.com'

export class GithubAuthStore {
  /**
   * @param location - where the configuration lives.
   * @param environment - encryption and network.
   */
  constructor(
    private readonly location: ConfigLocation,
    private readonly environment: GithubAuthEnvironment
  ) {}

  private read(): SavedAuth | null {
    const raw = readJsonFile<Partial<SavedAuth>>(this.location.file('github-auth.json'), {})
    if (typeof raw.token !== 'string' || raw.token === '' || typeof raw.login !== 'string') {
      return null
    }
    return {
      login: raw.login,
      name: typeof raw.name === 'string' ? raw.name : '',
      encrypted: raw.encrypted === true,
      token: raw.token
    }
  }

  /** Who is logged in. */
  state(): GithubLoginState {
    const saved = this.read()
    if (!saved) return { ...LOGGED_OUT }
    return { loggedIn: true, login: saved.login, name: saved.name, encrypted: saved.encrypted }
  }

  /**
   * The saved token, for the main process's own GitHub API calls.
   *
   * @returns the token, `null` when logged out or when it can't be decrypted.
   */
  async token(): Promise<string | null> {
    const saved = this.read()
    if (!saved) return null
    if (!saved.encrypted) return saved.token
    try {
      const decrypted = await this.environment.decrypt(Buffer.from(saved.token, 'base64'))
      if (decrypted.shouldReEncrypt) await this.reEncrypt(saved, decrypted.result)
      return decrypted.result
    } catch {
      return null
    }
  }

  /**
   * Saves the token again, encrypted with the keyring's current key.
   *
   * @param saved - what is saved.
   * @param token - the token in clear.
   */
  private async reEncrypt(saved: SavedAuth, token: string): Promise<void> {
    try {
      const encrypted = await this.environment.encrypt(token)
      writeJsonFile(
        this.location.file('github-auth.json'),
        { ...saved, token: encrypted.toString('base64') },
        0o600
      )
    } catch {
      // The token still decrypts: it is saved again the next time.
    }
  }

  /**
   * Checks a token against GitHub and, when valid, saves it.
   *
   * @param token - a personal access token (untrusted).
   */
  async login(token: string): Promise<GithubLoginResult> {
    const trimmed = typeof token === 'string' ? token.trim() : ''
    if (trimmed === '') return { success: false, message: 'Enter a personal access token.' }
    if (!/^[\w-]+$/.test(trimmed)) {
      return { success: false, message: 'This does not look like a GitHub token.' }
    }
    let response: Response
    try {
      response = await this.environment.fetch(`${API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${trimmed}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: AbortSignal.timeout(15_000)
      })
    } catch {
      return { success: false, message: 'GitHub could not be reached.' }
    }
    if (response.status === 401) return { success: false, message: 'GitHub refused this token.' }
    if (!response.ok) {
      return { success: false, message: `GitHub answered with the status ${response.status}.` }
    }
    const user = (await response.json()) as { login?: unknown; name?: unknown }
    if (typeof user.login !== 'string') {
      return { success: false, message: 'GitHub’s answer was not understood.' }
    }
    const encrypted = await this.environment.isEncryptionAvailable()
    const saved: SavedAuth = {
      login: user.login,
      name: typeof user.name === 'string' ? user.name : '',
      encrypted,
      token: encrypted ? (await this.environment.encrypt(trimmed)).toString('base64') : trimmed
    }
    writeJsonFile(this.location.file('github-auth.json'), saved, 0o600)
    return { success: true, state: this.state() }
  }

  /** Forgets the saved token. */
  logout(): void {
    writeJsonFile(this.location.file('github-auth.json'), {}, 0o600)
  }
}
