import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PresetStore } from '../presets/preset-store'
import { ConfigLocation, migrateLegacyConfig } from './config-location'
import { SettingsStore } from './settings-store'
import { allAttributes } from '../../shared/repo-views'

const ALL = allAttributes()

let home: string
let location: ConfigLocation

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'grepo-home-'))
  location = new ConfigLocation(home)
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('ConfigLocation', () => {
  it('defaults to ~/.config/grepo', () => {
    expect(location.current()).toBe(join(home, '.config', 'grepo'))
  })

  it('moves the configuration, copying the files the target lacks', () => {
    new SettingsStore(location, home).write({ localReposPaths: ['/srv/repos'] })
    const target = join(home, 'elsewhere')
    location.change('${HOME}/elsewhere')
    expect(location.current()).toBe(target)
    expect(existsSync(join(target, 'settings.json'))).toBe(true)
    expect(new SettingsStore(location, home).read().localReposPaths).toEqual(['/srv/repos'])
  })

  it('does not overwrite files of the target, and can go back to the default', () => {
    const target = join(home, 'elsewhere')
    location.change(target)
    writeFileSync(join(target, 'settings.json'), '{"localReposPath":"/mine"}')
    location.change(join(home, '.config', 'grepo'))
    location.change(target)
    expect(readFileSync(join(target, 'settings.json'), 'utf8')).toContain('/mine')
    location.change(location.defaultDir)
    expect(location.current()).toBe(location.defaultDir)
  })

  it('refuses a relative path', () => {
    expect(() => location.change('relative/dir')).toThrow(/absolute/)
  })
})

describe('SettingsStore', () => {
  it('reads defaults, then what was saved', () => {
    const store = new SettingsStore(location, home)
    expect(store.view()).toMatchObject({
      colorTheme: 'catppuccin-mocha',
      localReposPaths: [home],
      configPath: join(home, '.config', 'grepo')
    })
    store.write({ colorTheme: 'nord-frost' })
    store.write({ localReposPaths: ['~/code', '/srv/more'] })
    expect(store.read()).toEqual({
      colorTheme: 'nord-frost',
      localReposPaths: ['~/code', '/srv/more']
    })
    expect(store.expandedLocalReposPaths()).toEqual([join(home, 'code'), '/srv/more'])
  })

  it('reads the single path of a settings file written before several were allowed', () => {
    mkdirSync(location.current(), { recursive: true })
    writeFileSync(location.file('settings.json'), '{"localReposPath":"/old/path"}')
    expect(new SettingsStore(location, home).read().localReposPaths).toEqual(['/old/path'])
    writeFileSync(location.file('settings.json'), '{"localReposPaths":["", "/a", "/a", " /b "]}')
    expect(new SettingsStore(location, home).read().localReposPaths).toEqual(['/a', '/b'])
  })

  it('ignores an unknown saved theme', () => {
    mkdirSync(location.current(), { recursive: true })
    writeFileSync(location.file('settings.json'), '{"colorTheme":"sepia"}')
    expect(new SettingsStore(location, home).read().colorTheme).toBe('catppuccin-mocha')
  })
})

describe('PresetStore', () => {
  it('saves, updates, configures, moves and deletes presets, keeping the search text', () => {
    const store = new PresetStore(location)
    expect(
      store.save('Web', {
        search: '-web$',
        tagFilter: { ui: 'only' },
        orgFilter: {},
        viewId: '',
        attributes: ALL
      })
    ).toEqual({
      success: true
    })
    expect(
      store.save('Api', {
        search: '-api$',
        tagFilter: {},
        orgFilter: {},
        viewId: '',
        attributes: ALL
      })
    ).toEqual({
      success: true
    })
    expect(
      store.update('Web', {
        search: '^web',
        tagFilter: { ui: 'exclude', bad: 'maybe' as never },
        orgFilter: {},
        viewId: '',
        attributes: ALL
      })
    ).toEqual({ success: true })
    expect(store.list().map((p) => [p.name, p.search, p.tagFilter])).toEqual([
      ['Web', '^web', { ui: 'exclude' }],
      ['Api', '-api$', {}]
    ])

    store.configure('Api', { sidebarEnabled: false, sidebarName: ' A ' })
    expect(store.list()[1]).toMatchObject({ sidebarEnabled: false, sidebarName: 'A' })

    store.move('Api', -1)
    expect(store.list().map((p) => p.name)).toEqual(['Api', 'Web'])
    store.move('Api', -1)
    expect(store.list().map((p) => p.name)).toEqual(['Api', 'Web'])

    store.save('Web', {
      search: 'again',
      tagFilter: {},
      orgFilter: {},
      viewId: '',
      attributes: ALL
    })
    expect(store.list()[1]).toMatchObject({ search: 'again', sidebarEnabled: true })

    expect(store.delete('Api')).toEqual({ success: true })
    expect(store.list().map((p) => p.name)).toEqual(['Web'])
  })

  it('refuses empty names and unknown presets', () => {
    const store = new PresetStore(location)
    expect(
      store.save('  ', { search: 'x', tagFilter: {}, orgFilter: {}, viewId: '', attributes: ALL })
    ).toMatchObject({
      success: false
    })
    expect(
      store.update('nope', {
        search: 'x',
        tagFilter: {},
        orgFilter: {},
        viewId: '',
        attributes: ALL
      })
    ).toMatchObject({
      success: false
    })
    expect(store.delete('nope')).toMatchObject({ success: false })
    expect(store.configure('nope', {})).toMatchObject({ success: false })
    expect(store.move('nope', 1)).toMatchObject({ success: false })
  })
})

describe('migrateLegacyConfig', () => {
  it('copies the former configuration once, without the encrypted GitHub login', () => {
    const legacy = join(home, 'old')
    const current = join(home, 'new')
    mkdirSync(legacy, { recursive: true })
    for (const name of ['settings.json', 'presets.json', 'github-auth.json', 'github-orgs.json']) {
      writeFileSync(join(legacy, name), `{"from":"${name}"}`)
    }
    expect(migrateLegacyConfig(legacy, current).sort()).toEqual([
      'github-orgs.json',
      'presets.json',
      'settings.json'
    ])
    expect(existsSync(join(current, 'github-auth.json'))).toBe(false)
    expect(readFileSync(join(current, 'settings.json'), 'utf8')).toContain('settings.json')
    // The former folder is kept, and a second start migrates nothing.
    expect(existsSync(join(legacy, 'settings.json'))).toBe(true)
    writeFileSync(join(legacy, 'settings.json'), '{"changed":true}')
    expect(migrateLegacyConfig(legacy, current)).toEqual([])
    expect(readFileSync(join(current, 'settings.json'), 'utf8')).not.toContain('changed')
  })

  it('does nothing without a former folder', () => {
    expect(migrateLegacyConfig(join(home, 'missing'), join(home, 'new'))).toEqual([])
    expect(existsSync(join(home, 'new'))).toBe(false)
  })
})
