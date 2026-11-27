import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scanRepositories } from './scan-repositories'

let root: string

/** Makes a repository folder with an optional origin and CircleCI folder. */
function makeRepo(path: string, remote?: string, circleci = false): void {
  mkdirSync(join(root, path, '.git'), { recursive: true })
  if (remote) {
    writeFileSync(join(root, path, '.git', 'config'), `[remote "origin"]\n\turl = ${remote}\n`)
  }
  if (circleci) mkdirSync(join(root, path, '.circleci'))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'grepo-scan-'))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('scanRepositories', () => {
  it('finds repositories, also grouped in folders, and reads their remote', () => {
    makeRepo('team/shop-web', 'git@github.com:example/shop-web.git', true)
    makeRepo('solo_tool')
    mkdirSync(join(root, 'not-a-repo', 'docs'), { recursive: true })
    makeRepo('team/shop-web/nested-should-be-ignored')
    const { repositories, scannedPaths } = scanRepositories([root])

    expect(scannedPaths).toEqual([root])
    expect(repositories.map((r) => r.folderName)).toEqual(['shop-web', 'solo_tool'])
    expect(repositories[0]).toMatchObject({
      cleanName: 'Shop Web',
      realName: 'example/shop-web',
      path: join(root, 'team', 'shop-web'),
      hasCircleci: true,
      github: { host: 'github.com', org: 'example', name: 'shop-web' }
    })
    expect(repositories[1]).toMatchObject({
      realName: 'solo_tool',
      github: null,
      hasCircleci: false
    })
  })

  it('scans several paths, listing a repository found under both once', () => {
    makeRepo('one/a')
    makeRepo('two/b')
    const { repositories, scannedPaths } = scanRepositories([
      join(root, 'one'),
      join(root, 'two'),
      root
    ])
    expect(scannedPaths).toHaveLength(3)
    expect(repositories.map((r) => r.folderName)).toEqual(['a', 'b'])
  })

  it('skips hidden and dependency folders', () => {
    makeRepo('node_modules/pkg')
    makeRepo('.hidden/repo')
    expect(scanRepositories([root]).repositories).toEqual([])
  })

  it('refuses a folder that does not exist', () => {
    expect(() => scanRepositories([root, join(root, 'missing')])).toThrow(/not a folder/)
  })
})
