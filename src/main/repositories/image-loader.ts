/**
 * Reads the image files of the naming rules as data URLs, so the page (whose CSP only allows
 * `data:` images) can show them. Results are cached until the file changes.
 *
 * @example
 * const loader = new ImageLoader('/home/me')
 * loader.load('~/Pictures/icon.png') // 'data:image/png;base64,…'
 */
import { readFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'

import { expandPath } from '../../shared/app-settings'

/** The largest image shown (bytes). */
export const MAX_IMAGE_BYTES = 1_000_000

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
}

export class ImageLoader {
  private readonly cache = new Map<string, { mtimeMs: number; url: string | null }>()

  /** @param home - the user's home folder, for `~` and `${HOME}`. */
  constructor(private readonly home: string) {}

  /**
   * Reads an image.
   *
   * @param path - the image's path, `~` and `${HOME}` allowed.
   * @returns the data URL, `null` when the file is missing, too big or not an image type.
   */
  load(path: string): string | null {
    const file = expandPath(path, this.home)
    const mime = MIME_TYPES[extname(file).toLowerCase()]
    if (!mime) return null
    try {
      const stats = statSync(file)
      const cached = this.cache.get(file)
      if (cached?.mtimeMs === stats.mtimeMs) return cached.url
      const url =
        stats.isFile() && stats.size <= MAX_IMAGE_BYTES
          ? `data:${mime};base64,${readFileSync(file).toString('base64')}`
          : null
      this.cache.set(file, { mtimeMs: stats.mtimeMs, url })
      return url
    } catch {
      return null
    }
  }
}
