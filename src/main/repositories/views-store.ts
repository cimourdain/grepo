/**
 * Saves the views of Settings → Repos → Views (`repo-views.json` in the configuration folder).
 * Before the first save, the only view is the default one, made from the page's original style.
 */
import { parseRepoViews, validateRepoViews, type RepoViews } from '../../shared/repo-views'
import type { Outcome } from '../../shared/ipc-contract'
import type { ConfigLocation } from '../config/config-location'
import { readJsonFile, writeJsonFile } from '../config/json-file'

export class ViewsStore {
  /** @param location - where the configuration lives. */
  constructor(private readonly location: ConfigLocation) {}

  /** The saved views. */
  read(): RepoViews {
    return parseRepoViews(readJsonFile<unknown>(this.location.file('repo-views.json'), {}))
  }

  /**
   * Saves views, refusing invalid ones.
   *
   * @param value - the views (untrusted).
   */
  write(value: unknown): Outcome {
    const views = parseRepoViews(value)
    const problem = validateRepoViews(views)
    if (problem !== '') return { success: false, message: problem }
    writeJsonFile(this.location.file('repo-views.json'), views)
    return { success: true }
  }
}
