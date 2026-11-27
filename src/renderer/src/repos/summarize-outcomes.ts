/**
 * Writes what an action did as the lines the Repos page shows.
 *
 * @example
 * summarizeOutcomes([{ action: 'circleci', repository: 'api', status: 'skipped', message: 'No .circleci folder.' }])
 * // { done: 0, problems: ['Circleci · api: No .circleci folder.'] }
 */
import {
  repositoryActionLabels,
  type RepositoryActionOutcome
} from '../../../shared/repository-actions'

/** What the page says of an action's outcomes. */
export interface OutcomeSummary {
  /** How many repositories (or windows) the action worked on. */
  done: number
  /** One line per skipped or failed one. */
  problems: string[]
}

/**
 * Summarizes outcomes.
 *
 * @param outcomes - what the action reported.
 */
export function summarizeOutcomes(outcomes: readonly RepositoryActionOutcome[]): OutcomeSummary {
  return {
    done: outcomes.filter((outcome) => outcome.status === 'done').length,
    problems: outcomes
      .filter((outcome) => outcome.status !== 'done')
      .map(
        (outcome) =>
          `${repositoryActionLabels[outcome.action]} · ${outcome.repository}: ${outcome.message}`
      )
  }
}
