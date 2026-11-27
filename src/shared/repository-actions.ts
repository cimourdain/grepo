/**
 * The actions the Repos page runs on repositories, and what each reported.
 *
 * @example
 * actionsOf('all') // ['github', 'circleci', 'vscode']
 */

/** An action button. */
export const repositoryActions = ['github', 'circleci', 'vscode', 'all'] as const

/** What the buttons and the menu offer. */
export type RepositoryActionChoice = (typeof repositoryActions)[number]

/** An action actually run, `all` being the three together. */
export type SingleRepositoryAction = Exclude<RepositoryActionChoice, 'all'>

/** The labels of the actions. */
export const repositoryActionLabels: Readonly<Record<RepositoryActionChoice, string>> = {
  github: 'Github',
  circleci: 'Circleci',
  vscode: 'VSCode',
  all: 'All'
}

/**
 * Parses an action sent by the page.
 *
 * @param value - the value (untrusted).
 * @returns the action, `null` when it isn't one.
 */
export function parseRepositoryAction(value: unknown): RepositoryActionChoice | null {
  return typeof value === 'string' && (repositoryActions as readonly string[]).includes(value)
    ? (value as RepositoryActionChoice)
    : null
}

/**
 * Lists the single actions a choice stands for.
 *
 * @param choice - the choice.
 */
export function actionsOf(choice: RepositoryActionChoice): SingleRepositoryAction[] {
  return choice === 'all' ? ['github', 'circleci', 'vscode'] : [choice]
}

/** What happened to one repository for one action. */
export interface RepositoryActionOutcome {
  action: SingleRepositoryAction
  /** The repository's folder name (or the path, for one the app doesn't know). */
  repository: string
  status: 'done' | 'skipped' | 'failed'
  /** Why it was skipped or failed; empty when done. */
  message: string
}
