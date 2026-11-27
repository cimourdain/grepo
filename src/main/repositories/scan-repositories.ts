/**
 * Inspects the local repositories folder: every folder holding a `.git` entry is a repository.
 * Folders that aren't repositories are searched down to `MAX_DEPTH` levels (the workspace may
 * group repositories by team: `code/team/<repository>`), the usual heavy folders skipped, and a
 * repository's own subfolders are never searched.
 *
 * @example
 * const inventory = scanRepositories('/home/me/code')
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import {
  cleanRepositoryName,
  parseGithubRemote,
  type Repository,
  type RepositoryInventory
} from '../../shared/repository'
import { originUrlOf } from './git-remote'

/** How many folder levels under the repositories path are searched. */
export const MAX_DEPTH = 3

/** Folders that never hold a workspace repository. */
const SKIPPED_FOLDERS = new Set(['node_modules', '.cache', '.venv', 'venv', 'dist', 'target'])

/**
 * Reads one repository.
 *
 * @param path - the repository's absolute path.
 * @param folderName - its folder's name.
 */
export function readRepository(path: string, folderName: string): Repository {
  let remoteUrl: string | null = null
  try {
    remoteUrl = originUrlOf(readFileSync(join(path, '.git', 'config'), 'utf8'))
  } catch {
    // A `.git` file (worktree, submodule) or an unreadable configuration: no remote known.
  }
  const github = remoteUrl === null ? null : parseGithubRemote(remoteUrl)
  return {
    folderName,
    cleanName: cleanRepositoryName(folderName),
    cleanParts: [{ type: 'text', text: cleanRepositoryName(folderName) }],
    tags: [],
    realName: github ? `${github.org}/${github.name}` : folderName,
    path,
    remoteUrl,
    github,
    hasCircleci: isDirectory(join(path, '.circleci'))
  }
}

/**
 * Tells whether a path is a folder.
 *
 * @param path - the path.
 */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * Inspects a folder for repositories.
 *
 * @param roots - the local repositories paths. A repository found under several is listed once.
 * @param now - the current time, for the inventory's date.
 * @throws when a path doesn't exist or isn't a folder (every such path is named).
 */
export function scanRepositories(
  roots: readonly string[],
  now: Date = new Date()
): RepositoryInventory {
  const missing = roots.filter((root) => !isDirectory(root))
  if (missing.length > 0) {
    throw new Error(missing.map((root) => `“${root}” is not a folder that exists.`).join(' '))
  }
  const repositories: Repository[] = []
  const seen = new Set<string>()

  const visit = (folder: string, depth: number): void => {
    let entries: string[]
    try {
      entries = readdirSync(folder).sort((a, b) => a.localeCompare(b))
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.startsWith('.') || SKIPPED_FOLDERS.has(entry)) continue
      const path = join(folder, entry)
      if (!isDirectory(path)) continue
      if (existsSync(join(path, '.git'))) {
        if (!seen.has(path)) repositories.push(readRepository(path, entry))
        seen.add(path)
      } else if (depth < MAX_DEPTH) visit(path, depth + 1)
    }
  }
  for (const root of roots) visit(root, 1)

  repositories.sort(
    (a, b) => a.cleanName.localeCompare(b.cleanName) || a.path.localeCompare(b.path)
  )
  return { repositories, scannedPaths: [...roots], scannedAt: now.toISOString() }
}
