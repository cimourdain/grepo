/**
 * Clones a GitHub repository with `git clone` over SSH (the user's own keys: no token is used),
 * into `<target folder>/<repository name>`. The address is built here from the organization and
 * name, which are checked: the page never sends a URL. What runs git is injected, for tests.
 *
 * @example
 * await cloneRepository('example', 'api', '/home/me/code', runGit) // { success: true, path: '/home/me/code/api' }
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { isAbsolutePath } from '../../shared/app-settings'
import type { CloneResult } from '../../shared/github-orgs'

/** Runs a git command; rejects with git's error text. */
export type GitRunner = (args: string[]) => Promise<void>

/** What GitHub allows in an organization or repository name. */
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/

/** How long a clone may take before it is stopped (ms). */
const CLONE_TIMEOUT_MS = 10 * 60 * 1000

/**
 * Runs git with the system's `git` command, without a shell and without prompts.
 *
 * @param args - git's arguments.
 */
export const runGit: GitRunner = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      timeout: CLONE_TIMEOUT_MS
    })
    let errorText = ''
    child.stderr.on('data', (chunk: Buffer) => (errorText += chunk.toString()))
    child.once('error', (error) =>
      reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? new Error('The `git` command was not found.')
          : error
      )
    )
    child.once('close', (code) =>
      code === 0 ? resolve() : reject(new Error(errorText.trim() || `git exited with ${code}.`))
    )
  })

/**
 * Clones a repository.
 *
 * @param org - the repository's organization (untrusted).
 * @param name - the repository's name (untrusted).
 * @param targetFolder - the absolute folder to clone into, created when missing.
 * @param run - what runs git.
 */
export async function cloneRepository(
  org: string,
  name: string,
  targetFolder: string,
  run: GitRunner = runGit
): Promise<CloneResult> {
  if (
    ![org, name].every(
      (part) => typeof part === 'string' && NAME_PATTERN.test(part) && part !== '.' && part !== '..'
    )
  ) {
    return { success: false, message: 'This repository name is not valid.' }
  }
  if (!isAbsolutePath(targetFolder)) {
    return { success: false, message: 'The clone path must be absolute.' }
  }
  const destination = join(targetFolder, name)
  if (existsSync(destination)) {
    return { success: false, message: `“${destination}” already exists.` }
  }
  try {
    mkdirSync(targetFolder, { recursive: true })
    await run(['clone', '--', `git@github.com:${org}/${name}.git`, destination])
    return { success: true, path: destination }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
