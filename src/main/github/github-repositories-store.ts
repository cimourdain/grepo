/**
 * Saves the result of the last repositories inspection (`github-repositories.json` in the
 * configuration folder), so the Github tab shows it again without asking GitHub. Logging out
 * clears it.
 */
import type { RemoteRepository } from '../../shared/github-orgs'
import type { ConfigLocation } from '../config/config-location'
import { readJsonFile, writeJsonFile } from '../config/json-file'

/** What is saved. */
export interface SavedRepositories {
  repositories: RemoteRepository[]
  /** When the inspection was made (ISO 8601); empty when none was. */
  inspectedAt: string
}

export class GithubRepositoriesStore {
  /** @param location - where the configuration lives. */
  constructor(private readonly location: ConfigLocation) {}

  /** The saved result; empty before the first inspection. */
  read(): SavedRepositories {
    const raw = readJsonFile<Partial<SavedRepositories>>(
      this.location.file('github-repositories.json'),
      {}
    )
    return {
      repositories: Array.isArray(raw.repositories) ? raw.repositories : [],
      inspectedAt: typeof raw.inspectedAt === 'string' ? raw.inspectedAt : ''
    }
  }

  /**
   * Saves a result.
   *
   * @param saved - the repositories found and when.
   */
  write(saved: SavedRepositories): void {
    writeJsonFile(this.location.file('github-repositories.json'), saved)
  }

  /** Forgets the result. */
  clear(): void {
    this.write({ repositories: [], inspectedAt: '' })
  }
}
