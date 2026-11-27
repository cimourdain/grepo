/**
 * Runs an action of the Repos page on repositories:
 *
 * - Github: opens the repository's GitHub page, built from its git remote;
 * - Circleci: opens its CircleCI pipelines, when a `.circleci/` folder is at its root;
 * - VSCode: opens the repositories in one VS Code window, through a temporary workspace file;
 * - All: the three.
 *
 * What opens a URL or VS Code is injected, so the logic runs in tests without a desktop.
 *
 * @example
 * const outcomes = await runRepositoryAction('all', repositories, { openUrl, openWorkspace, workspaceDirectory })
 */
import {
  actionsOf,
  type RepositoryActionChoice,
  type RepositoryActionOutcome,
  type SingleRepositoryAction
} from '../../shared/repository-actions'
import { circleciUrlOf, githubUrlOf, type Repository } from '../../shared/repository'
import { randomWorkspaceColors, writeWorkspaceFile, type WorkspaceColors } from './vscode-workspace'

/** What the action needs from the system. */
export interface ActionEnvironment {
  /** Opens an address in the user's browser. */
  openUrl: (url: string) => Promise<void>
  /** Opens a workspace file in VS Code. */
  openWorkspace: (workspaceFile: string) => Promise<void>
  /** Where the temporary workspace files are written. */
  workspaceDirectory: string
  /** The colors of a workspace window (random by default). */
  colors?: () => WorkspaceColors
}

/**
 * Describes a failure.
 *
 * @param error - what was thrown.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Runs one URL action on a repository.
 *
 * @param action - `github` or `circleci`.
 * @param repository - the repository.
 * @param environment - what opens the address.
 */
async function openRepositoryPage(
  action: 'github' | 'circleci',
  repository: Repository,
  environment: ActionEnvironment
): Promise<RepositoryActionOutcome> {
  const outcome = (
    status: RepositoryActionOutcome['status'],
    message = ''
  ): RepositoryActionOutcome => ({ action, repository: repository.folderName, status, message })
  if (!repository.github) {
    return outcome('skipped', 'The repository has no GitHub remote.')
  }
  if (action === 'circleci' && !repository.hasCircleci) {
    return outcome('skipped', 'The repository has no .circleci folder.')
  }
  const url =
    action === 'github' ? githubUrlOf(repository.github) : circleciUrlOf(repository.github)
  try {
    await environment.openUrl(url)
    return outcome('done')
  } catch (error) {
    return outcome('failed', messageOf(error))
  }
}

/**
 * Runs an action on repositories.
 *
 * @param choice - the action.
 * @param repositories - the repositories, known ones only.
 * @param environment - what opens addresses and VS Code.
 * @returns what happened, per action and repository.
 */
export async function runRepositoryAction(
  choice: RepositoryActionChoice,
  repositories: readonly Repository[],
  environment: ActionEnvironment
): Promise<RepositoryActionOutcome[]> {
  const outcomes: RepositoryActionOutcome[] = []
  for (const action of actionsOf(choice) satisfies SingleRepositoryAction[]) {
    if (action === 'vscode') {
      if (repositories.length === 0) continue
      const label =
        repositories.length === 1
          ? repositories[0]!.folderName
          : `${repositories.length} repositories`
      try {
        const file = writeWorkspaceFile(
          environment.workspaceDirectory,
          repositories,
          (environment.colors ?? randomWorkspaceColors)()
        )
        await environment.openWorkspace(file)
        outcomes.push({ action, repository: label, status: 'done', message: '' })
      } catch (error) {
        outcomes.push({ action, repository: label, status: 'failed', message: messageOf(error) })
      }
      continue
    }
    for (const repository of repositories) {
      outcomes.push(await openRepositoryPage(action, repository, environment))
    }
  }
  return outcomes
}
