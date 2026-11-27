/**
 * Which links the app window opens outside the app: a page's
 * `target="_blank"` links — the About page's GitHub link, a connector's
 * documentation — are handed to the user's browser by the main window's
 * window-open handler (`../index.ts`) only when they are `https:` URLs
 * without embedded credentials; anything else is refused, and the app
 * window itself never navigates.
 *
 * @example
 * isExternalLinkAllowed('https://github.com/example-org/example-repo') // true
 * isExternalLinkAllowed('file:///etc/passwd') // false
 */

/**
 * Tells whether a link may be opened in the user's browser.
 *
 * @param url - the requested URL (untrusted).
 */
export function isExternalLinkAllowed(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.username === '' && parsed.password === ''
  } catch {
    return false
  }
}
