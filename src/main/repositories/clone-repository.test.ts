import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloneRepository } from './clone-repository'

let base: string

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'grepo-clone-'))
})
afterEach(() => rmSync(base, { recursive: true, force: true }))

describe('cloneRepository', () => {
  it('clones over SSH into a folder of the repository’s name, creating the target folder', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    const target = join(base, 'new', 'folder')
    const result = await cloneRepository('example', 'api', target, run)
    expect(result).toEqual({ success: true, path: join(target, 'api') })
    expect(run).toHaveBeenCalledWith([
      'clone',
      '--',
      'git@github.com:example/api.git',
      join(target, 'api')
    ])
  })

  it('refuses unsafe names, relative paths and existing folders', async () => {
    const run = vi.fn()
    expect(await cloneRepository('example', '../evil', base, run)).toMatchObject({ success: false })
    expect(await cloneRepository('a/b', 'x', base, run)).toMatchObject({ success: false })
    expect(await cloneRepository('example', '--upload-pack=x', base, run)).toMatchObject({
      success: false
    })
    expect(await cloneRepository('example', 'api', 'relative', run)).toMatchObject({
      success: false,
      message: expect.stringMatching(/absolute/)
    })
    mkdirSync(join(base, 'api'))
    expect(await cloneRepository('example', 'api', base, run)).toMatchObject({
      success: false,
      message: expect.stringMatching(/already exists/)
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('reports git’s failure', async () => {
    const run = vi.fn().mockRejectedValue(new Error('Permission denied (publickey).'))
    expect(await cloneRepository('example', 'api', base, run)).toEqual({
      success: false,
      message: 'Permission denied (publickey).'
    })
  })
})
