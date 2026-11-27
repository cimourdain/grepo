import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ConfigLocation } from '../config/config-location'
import { GithubOrgsStore } from './github-orgs-store'

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'grepo-orgs-'))
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('GithubOrgsStore', () => {
  it('keeps the selection across new inspections, and clears on logout', () => {
    const store = new GithubOrgsStore(new ConfigLocation(home))
    expect(store.read()).toEqual({
      inspection: null,
      selection: { disabledOrgs: [], disabledTeams: [] }
    })
    store.saveSelection({ disabledOrgs: ['Example'], disabledTeams: [] })
    const inspection = {
      orgs: [{ login: 'Example', teams: [] }],
      inspectedAt: 'now',
      ssoRequired: ['Example']
    }
    store.saveInspection(inspection)
    expect(store.read()).toEqual({
      inspection,
      selection: { disabledOrgs: ['example'], disabledTeams: [] }
    })
    store.clear()
    expect(store.read().inspection).toBeNull()
    expect(store.read().selection.disabledOrgs).toEqual([])
  })
})
