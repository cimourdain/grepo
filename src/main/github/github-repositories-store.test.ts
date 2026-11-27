import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ConfigLocation } from '../config/config-location'
import { GithubRepositoriesStore } from './github-repositories-store'

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'grepo-ghrepos-'))
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('GithubRepositoriesStore', () => {
  it('saves the inspection result locally, and forgets it on clear', () => {
    const store = new GithubRepositoriesStore(new ConfigLocation(home))
    expect(store.read()).toEqual({ repositories: [], inspectedAt: '' })
    const saved = {
      repositories: [
        {
          org: 'example',
          name: 'api',
          fullName: 'example/api',
          htmlUrl: 'https://github.com/example/api',
          teams: ['example/web'],
          status: 'missing' as const,
          localPath: ''
        }
      ],
      inspectedAt: '2026-01-01T00:00:00.000Z'
    }
    store.write(saved)
    expect(new GithubRepositoriesStore(new ConfigLocation(home)).read()).toEqual(saved)
    store.clear()
    expect(store.read()).toEqual({ repositories: [], inspectedAt: '' })
  })
})
