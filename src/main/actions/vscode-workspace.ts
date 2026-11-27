/**
 * Builds the temporary VS Code workspace file opening several repositories at once, each window
 * tinted with a random color (`workbench.colorCustomizations`) so it can be told apart from the
 * others.
 *
 * @example
 * const workspace = buildWorkspace(repositories, randomWorkspaceColors())
 * // { folders: [{ path, name }], settings: { 'workbench.colorCustomizations': {...} } }
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { foregroundOn, hslToHex } from '../../shared/color'
import type { Repository } from '../../shared/repository'

export { foregroundOn, hslToHex }

/** The colors tinting a workspace's window. */
export interface WorkspaceColors {
  background: string
  foreground: string
}

/**
 * Picks random colors: a random hue, pastel enough to stay pleasant, with a readable text color.
 *
 * @param random - a source of numbers in [0, 1), replaceable in tests.
 */
export function randomWorkspaceColors(random: () => number = Math.random): WorkspaceColors {
  const background = hslToHex(
    Math.floor(random() * 360),
    0.55 + random() * 0.25,
    0.4 + random() * 0.25
  )
  return { background, foreground: foregroundOn(background) }
}

/**
 * Builds the content of a workspace file.
 *
 * @param repositories - the repositories to open.
 * @param colors - the colors tinting the window.
 */
export function buildWorkspace(
  repositories: readonly Pick<Repository, 'path' | 'folderName'>[],
  colors: WorkspaceColors
): object {
  return {
    folders: repositories.map((repository) => ({
      path: repository.path,
      name: repository.folderName
    })),
    settings: {
      'workbench.colorCustomizations': {
        'titleBar.activeBackground': colors.background,
        'titleBar.inactiveBackground': colors.background,
        'titleBar.activeForeground': colors.foreground,
        'titleBar.inactiveForeground': colors.foreground
      },
      'files.exclude': { '**/.git': false }
    }
  }
}

/**
 * Writes a temporary workspace file.
 *
 * @param directory - the folder holding the workspace files.
 * @param repositories - the repositories to open.
 * @param colors - the colors tinting the window.
 * @param now - the current time, making the file name unique.
 * @returns the file's path.
 */
export function writeWorkspaceFile(
  directory: string,
  repositories: readonly Pick<Repository, 'path' | 'folderName'>[],
  colors: WorkspaceColors,
  now: number = Date.now()
): string {
  mkdirSync(directory, { recursive: true })
  const label = repositories.length === 1 ? repositories[0]!.folderName : 'repos'
  const path = join(directory, `grepo-${label.replace(/[^\w.-]/g, '_')}-${now}.code-workspace`)
  writeFileSync(path, `${JSON.stringify(buildWorkspace(repositories, colors), null, 2)}\n`)
  return path
}
