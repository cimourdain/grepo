/**
 * Saves the repositories the last inspection found (`repositories.json` in the configuration
 * folder), so the Repos page lists them without scanning the disk each time.
 */
import type { RepositoryInventory } from '../../shared/repository'
import { readJsonFile, writeJsonFile } from '../config/json-file'
import type { ConfigLocation } from '../config/config-location'

const EMPTY: RepositoryInventory = { repositories: [], scannedPaths: [], scannedAt: '' }

export class RepositoryStore {
  /** @param location - where the configuration lives. */
  constructor(private readonly location: ConfigLocation) {}

  /** The saved inventory; an empty one before the first inspection. */
  read(): RepositoryInventory {
    const raw = readJsonFile<Partial<RepositoryInventory>>(
      this.location.file('repositories.json'),
      EMPTY
    )
    const legacy = raw as { scannedPath?: unknown }
    return {
      repositories: Array.isArray(raw.repositories) ? raw.repositories : [],
      // A file written before several paths were allowed holds one, `scannedPath`.
      scannedPaths: Array.isArray(raw.scannedPaths)
        ? raw.scannedPaths.filter((path): path is string => typeof path === 'string')
        : typeof legacy.scannedPath === 'string' && legacy.scannedPath !== ''
          ? [legacy.scannedPath]
          : [],
      scannedAt: typeof raw.scannedAt === 'string' ? raw.scannedAt : ''
    }
  }

  /**
   * Replaces the saved inventory.
   *
   * @param inventory - what an inspection found.
   */
  write(inventory: RepositoryInventory): void {
    writeJsonFile(this.location.file('repositories.json'), inventory)
  }
}
