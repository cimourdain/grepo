/**
 * Reads and writes the JSON files of the local configuration folder.
 *
 * @example
 * const settings = readJsonFile('/home/me/.config/grepo/settings.json', {})
 * writeJsonFile('/home/me/.config/grepo/settings.json', settings)
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Reads a JSON file.
 *
 * @param path - the file.
 * @param fallback - what a missing, unreadable or invalid file reads as.
 */
export function readJsonFile<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

/**
 * Writes a JSON file whole and atomically (a temporary file renamed over it), creating its folder.
 *
 * @param path - the file.
 * @param value - what to write.
 * @param mode - the file's permission bits.
 */
export function writeJsonFile(path: string, value: unknown, mode = 0o644): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode })
  renameSync(temporary, path)
}
