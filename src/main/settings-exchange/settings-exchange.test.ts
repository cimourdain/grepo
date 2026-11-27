import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { parseExportFile } from '../../shared/settings-exchange'
import { ConfigLocation } from '../config/config-location'
import { SettingsStore } from '../config/settings-store'
import { PresetStore } from '../presets/preset-store'
import { RulesStore } from '../repositories/rules-store'
import { ViewsStore } from '../repositories/views-store'
import { SettingsExchange } from './settings-exchange'

let home: string
let source: SettingsExchange
let target: SettingsExchange

/** Builds the stores in a configuration folder. */
function exchangeIn(folder: string): SettingsExchange {
  const location = new ConfigLocation(folder)
  return new SettingsExchange({
    settings: new SettingsStore(location, folder),
    rules: new RulesStore(location),
    views: new ViewsStore(location),
    presets: new PresetStore(location)
  })
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'grepo-exchange-'))
  source = exchangeIn(join(home, 'source'))
  target = exchangeIn(join(home, 'target'))
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('SettingsExchange', () => {
  it('exports the current settings and imports them into another configuration', () => {
    const stores = {
      location: new ConfigLocation(join(home, 'source')),
      home: join(home, 'source')
    }
    new SettingsStore(stores.location, stores.home).write({ localReposPaths: ['/a', '/b'] })
    new RulesStore(stores.location).write({
      namingRules: [{ search: '^x', type: 'text', value: 'X' }],
      tagRules: [{ search: 'y', tags: ['t'], target: 'path' }],
      tagColors: { t: '#112233' }
    })
    new ViewsStore(stores.location).write({
      views: [
        { id: 'default', name: 'Default', fontSize: 16, minItemWidth: 300 },
        { id: 'c', name: 'Compact', fontSize: 12, minItemWidth: 200 }
      ],
      defaultId: 'c'
    })
    const presets = new PresetStore(stores.location)
    presets.save('P', {
      search: 's',
      tagFilter: { t: 'only' },
      orgFilter: {},
      viewId: 'c',
      attributes: { org: true, name: false, tags: true, buttons: true }
    })

    const file = JSON.parse(JSON.stringify(source.export(new Date())))
    expect(file.localReposPaths).toEqual(['/a', '/b'])
    expect(file.view.presets).toHaveLength(1)
    expect(JSON.stringify(file)).not.toMatch(/token/i)

    const parsed = parseExportFile(file)
    expect(parsed.success).toBe(true)
    if (parsed.success) target.apply(parsed.data)
    expect(target.current()).toEqual(source.current())
  })

  it('replaces what the target had', () => {
    const location = new ConfigLocation(join(home, 'target'))
    new PresetStore(location).save('Old', {
      search: '',
      tagFilter: {},
      orgFilter: {},
      viewId: '',
      attributes: { org: true, name: true, tags: true, buttons: true }
    })
    const parsed = parseExportFile(JSON.parse(JSON.stringify(source.export(new Date()))))
    if (parsed.success) target.apply(parsed.data)
    expect(target.current().view.presets).toEqual([])
  })

  it('exports without the local-path settings, and importing such a file keeps the target’s own', () => {
    const sourceLocation = new ConfigLocation(join(home, 'source'))
    new SettingsStore(sourceLocation, join(home, 'source')).write({
      localReposPaths: ['/source/code']
    })
    new RulesStore(sourceLocation).write({
      namingRules: [{ search: '^a', type: 'text', value: 'A' }],
      tagRules: [
        { search: 'web', tags: ['web'], target: 'name' },
        { search: '/source/', tags: ['source-only'], target: 'path' }
      ],
      tagColors: {}
    })
    const targetLocation = new ConfigLocation(join(home, 'target'))
    new SettingsStore(targetLocation, join(home, 'target')).write({
      localReposPaths: ['/target/code']
    })
    new RulesStore(targetLocation).write({
      namingRules: [],
      tagRules: [{ search: '/target/', tags: ['target-only'], target: 'path' }],
      tagColors: {}
    })

    const file = JSON.parse(JSON.stringify(source.export(new Date(), false)))
    expect(file.localReposPaths).toEqual([])
    expect(file.rules.tagRules.map((rule: { target: string }) => rule.target)).toEqual(['name'])

    const parsed = parseExportFile(file)
    if (parsed.success) target.apply(parsed.data)
    const after = target.current()
    expect(after.localReposPaths).toEqual(['/target/code'])
    expect(after.rules.namingRules).toHaveLength(1) // the file's
    expect(after.rules.tagRules).toEqual([
      { search: 'web', tags: ['web'], target: 'name' },
      { search: '/target/', tags: ['target-only'], target: 'path' } // kept
    ])
  })
})
