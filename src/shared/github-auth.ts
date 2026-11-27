/**
 * The GitHub login state the Settings page shows. The token itself never leaves the main
 * process.
 */

/** Who is logged in to GitHub. */
export interface GithubLoginState {
  loggedIn: boolean
  /** The account's login name; empty when logged out. */
  login: string
  /** The account's display name, when it has one. */
  name: string
  /** Whether the saved token is encrypted with the system's keyring (else file permissions only). */
  encrypted: boolean
}

/** The result of a login attempt. */
export type GithubLoginResult =
  { success: true; state: GithubLoginState } | { success: false; message: string }

/** What a logged-out user looks like. */
export const LOGGED_OUT: Readonly<GithubLoginState> = {
  loggedIn: false,
  login: '',
  name: '',
  encrypted: false
}
