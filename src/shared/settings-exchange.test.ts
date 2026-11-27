import { describe, expect, it } from 'vitest'

import {
  buildExportFile,
  exportFileName,
  parseExportFile,
  summarize,
  withoutLocalPaths,
  type ExchangeData
} from './settings-exchange'

const data: ExchangeData = {
  includesLocalPaths: true,
  localReposPaths: ['/home/me/code', '/srv/code'],
  rules: {
    namingRules: [{ search: '^shop-', type: 'text', value: 'G' }],
    tagRules: [
      { search: 'web', tags: ['web'], target: 'name' },
      { search: '/work/', tags: ['work'], target: 'path' }
    ],
    tagColors: { web: '#336699' }
  },
  view: {
    views: {
      views: [{ id: 'default', name: 'Default', fontSize: 16, minItemWidth: 300 }],
      defaultId: 'default'
    },
    presets: [
      {
        name: 'Web',
        search: '-web$',
        tagFilter: { web: 'only' },
        orgFilter: {},
        viewId: 'default',
        attributes: { org: true, name: true, tags: false, buttons: true },
        sidebarEnabled: true,
        sidebarName: ''
      }
    ]
  }
}

describe('settings exchange file', () => {
  it('exports the paths, the rules and the View settings, and reads them back', () => {
    const file = buildExportFile(data, new Date('2026-01-01T00:00:00Z'))
    expect(file).toMatchObject({ app: 'grepo', format: 1, exportedAt: '2026-01-01T00:00:00.000Z' })
    expect(Object.keys(file).sort()).toEqual(
      [
        'app',
        'exportedAt',
        'format',
        'includesLocalPaths',
        'localReposPaths',
        'rules',
        'view'
      ].sort()
    )
    const parsed = parseExportFile(JSON.parse(JSON.stringify(file)))
    expect(parsed).toEqual({ success: true, data })
    expect(summarize(data)).toEqual({
      includesLocalPaths: true,
      localReposPaths: 2,
      namingRules: 1,
      tagRules: 2,
      views: 1,
      presets: 1
    })
  })

  it('can leave out the local-path settings: the paths and the tag rules on the local path', () => {
    const file = buildExportFile(data, new Date(), false)
    expect(file.includesLocalPaths).toBe(false)
    expect(file.localReposPaths).toEqual([])
    expect(file.rules.tagRules).toEqual([{ search: 'web', tags: ['web'], target: 'name' }])
    // The rest is kept, and the data given isn't changed.
    expect(file.rules.namingRules).toEqual(data.rules.namingRules)
    expect(file.view).toEqual(data.view)
    expect(data.rules.tagRules).toHaveLength(2)
    // Included by default.
    expect(buildExportFile(data, new Date()).localReposPaths).toEqual(data.localReposPaths)

    const parsed = parseExportFile(JSON.parse(JSON.stringify(file)))
    expect(parsed).toMatchObject({
      success: true,
      data: { includesLocalPaths: false, localReposPaths: [] }
    })
    expect(summarize(withoutLocalPaths(data))).toMatchObject({
      includesLocalPaths: false,
      localReposPaths: 0,
      tagRules: 1
    })
  })

  it('reads a file saying it has no local-path settings without needing paths, and drops path rules it holds', () => {
    const file = JSON.parse(JSON.stringify(buildExportFile(data, new Date())))
    file.includesLocalPaths = false
    delete file.localReposPaths
    const parsed = parseExportFile(file)
    expect(parsed.success && parsed.data.includesLocalPaths).toBe(false)
    expect(parsed.success && parsed.data.rules.tagRules.map((rule) => rule.target)).toEqual([
      'name'
    ])
  })

  it('reads a file that does not say it (made before the option) as including them', () => {
    const file = JSON.parse(JSON.stringify(buildExportFile(data, new Date())))
    delete file.includesLocalPaths
    expect(parseExportFile(file)).toMatchObject({
      success: true,
      data: { includesLocalPaths: true }
    })
    delete file.localReposPaths
    expect(parseExportFile(file)).toMatchObject({ success: false })
  })

  it('refuses what is not a Grepo file, or of another format', () => {
    for (const value of [null, 'text', {}, { app: 'other', format: 1 }]) {
      expect(parseExportFile(value)).toMatchObject({ success: false })
    }
    expect(parseExportFile({ app: 'grepo', format: 2 })).toMatchObject({
      success: false,
      message: expect.stringMatching(/format \(2\)/)
    })
  })

  it('refuses a file with an invalid part, whole, with the reason', () => {
    const file = JSON.parse(JSON.stringify(buildExportFile(data, new Date())))
    const bad = (change: (copy: typeof file) => void): string => {
      const copy = JSON.parse(JSON.stringify(file))
      change(copy)
      const parsed = parseExportFile(copy)
      return parsed.success ? '' : parsed.message
    }
    expect(bad((f) => (f.localReposPaths = []))).toMatch(/no local repositories path/)
    expect(bad((f) => (f.localReposPaths = ['relative/dir']))).toMatch(/not an absolute path/)
    expect(bad((f) => (f.rules.namingRules[0].search = '('))).toMatch(
      /rules are invalid.*Naming rule 1/
    )
    expect(bad((f) => delete f.rules)).toMatch(/rules are missing/)
    expect(bad((f) => (f.view.views.views[0].name = ' '))).toMatch(/views are invalid/)
    expect(bad((f) => delete f.view)).toMatch(/View settings are missing/)
  })

  it('accepts Windows paths in an imported file', () => {
    const file = JSON.parse(JSON.stringify(buildExportFile(data, new Date())))
    file.localReposPaths = ['C:\\Sites\\repos', '\\\\server\\share']
    expect(parseExportFile(file, 'C:\\Users\\me')).toMatchObject({ success: true })
  })

  it('drops malformed and duplicated presets, and understands ~ and ${HOME} in the paths', () => {
    const file = JSON.parse(JSON.stringify(buildExportFile(data, new Date())))
    file.localReposPaths = ['~/code', '${HOME}/code']
    file.view.presets = [file.view.presets[0], file.view.presets[0], { nope: true }, null]
    const parsed = parseExportFile(file, '/home/me')
    expect(parsed.success && parsed.data.view.presets).toHaveLength(1)
    expect(parsed.success && parsed.data.localReposPaths).toEqual(['~/code', '${HOME}/code'])
  })
})

describe('exportFileName', () => {
  it('holds the local date and time of the export, to the second', () => {
    expect(exportFileName(new Date(2026, 0, 31, 9, 5, 7))).toBe(
      'grepo-settings-20260131-090507.json'
    )
    expect(exportFileName(new Date(2026, 11, 1, 23, 59, 0))).toBe(
      'grepo-settings-20261201-235900.json'
    )
  })

  it('sorts exports in the order they were made', () => {
    const names = [
      new Date(2026, 5, 1, 10, 0, 0),
      new Date(2025, 11, 31, 23, 0, 0),
      new Date(2026, 5, 1, 9, 0, 0)
    ].map(exportFileName)
    expect([...names].sort()).toEqual([names[1], names[2], names[0]])
  })
})
