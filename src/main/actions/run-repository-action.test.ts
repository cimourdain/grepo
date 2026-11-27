import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Repository } from '../../shared/repository'
import { runRepositoryAction, type ActionEnvironment } from './run-repository-action'

const withCircle: Repository = {
  folderName: 'api',
  cleanName: 'Api',
  cleanParts: [],
  tags: [],
  realName: 'example/api',
  path: '/w/api',
  remoteUrl: 'git@github.com:example/api.git',
  github: { host: 'github.com', org: 'example', name: 'api' },
  hasCircleci: true
}
const withoutCircle: Repository = {
  ...withCircle,
  folderName: 'web',
  path: '/w/web',
  hasCircleci: false
}
const noRemote: Repository = { ...withCircle, folderName: 'local', path: '/w/local', github: null }

let directory: string
let environment: ActionEnvironment & {
  openUrl: ReturnType<typeof vi.fn>
  openWorkspace: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'grepo-actions-'))
  environment = {
    openUrl: vi.fn().mockResolvedValue(undefined),
    openWorkspace: vi.fn().mockResolvedValue(undefined),
    workspaceDirectory: directory,
    colors: () => ({ background: '#112233', foreground: '#FFFFFF' })
  }
})
afterEach(() => rmSync(directory, { recursive: true, force: true }))

describe('runRepositoryAction', () => {
  it('opens the GitHub page of each repository', async () => {
    const outcomes = await runRepositoryAction('github', [withCircle, noRemote], environment)
    expect(environment.openUrl).toHaveBeenCalledOnce()
    expect(environment.openUrl).toHaveBeenCalledWith('https://github.com/example/api')
    expect(outcomes.map((o) => o.status)).toEqual(['done', 'skipped'])
  })

  it('opens CircleCI only for repositories with a .circleci folder', async () => {
    const outcomes = await runRepositoryAction('circleci', [withCircle, withoutCircle], environment)
    expect(environment.openUrl).toHaveBeenCalledOnce()
    expect(environment.openUrl).toHaveBeenCalledWith(
      'https://app.circleci.com/pipelines/github/example/api'
    )
    expect(outcomes[1]).toMatchObject({ status: 'skipped', repository: 'web' })
  })

  it('opens every repository in one VS Code window', async () => {
    const outcomes = await runRepositoryAction('vscode', [withCircle, withoutCircle], environment)
    expect(environment.openWorkspace).toHaveBeenCalledOnce()
    expect(String(environment.openWorkspace.mock.calls[0]![0])).toMatch(/\.code-workspace$/)
    expect(outcomes).toEqual([
      { action: 'vscode', repository: '2 repositories', status: 'done', message: '' }
    ])
  })

  it('runs the three actions for All', async () => {
    const outcomes = await runRepositoryAction('all', [withCircle], environment)
    expect(outcomes.map((o) => o.action)).toEqual(['github', 'circleci', 'vscode'])
    expect(outcomes.every((o) => o.status === 'done')).toBe(true)
  })

  it('reports failures instead of throwing', async () => {
    environment.openUrl.mockRejectedValue(new Error('no browser'))
    environment.openWorkspace.mockRejectedValue(new Error('no code'))
    const outcomes = await runRepositoryAction('all', [withCircle], environment)
    expect(outcomes.map((o) => o.status)).toEqual(['failed', 'failed', 'failed'])
    expect(outcomes[2]!.message).toBe('no code')
  })

  it('does nothing without repositories', async () => {
    expect(await runRepositoryAction('all', [], environment)).toEqual([])
  })
})
