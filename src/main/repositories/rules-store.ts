/**
 * Saves the naming and tag rules of Settings → Repos (`repo-rules.json` in the configuration
 * folder).
 */
import { parseRepoRules, validateRepoRules, type RepoRules } from '../../shared/repo-rules'
import type { Outcome } from '../../shared/ipc-contract'
import type { ConfigLocation } from '../config/config-location'
import { readJsonFile, writeJsonFile } from '../config/json-file'

export class RulesStore {
  /** @param location - where the configuration lives. */
  constructor(private readonly location: ConfigLocation) {}

  /** The saved rules; none before the first save. */
  read(): RepoRules {
    return parseRepoRules(readJsonFile<unknown>(this.location.file('repo-rules.json'), {}))
  }

  /**
   * Saves rules, refusing invalid ones.
   *
   * @param value - the rules (untrusted).
   */
  write(value: unknown): Outcome {
    const rules = parseRepoRules(value)
    const problem = validateRepoRules(rules)
    if (problem !== '') return { success: false, message: problem }
    writeJsonFile(this.location.file('repo-rules.json'), rules)
    return { success: true }
  }
}
