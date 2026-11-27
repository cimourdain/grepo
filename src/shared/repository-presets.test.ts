import { describe, expect, it } from 'vitest'

import { parsePreset, presetRoute, presetSidebarLabel } from './repository-presets'
import { allAttributes } from './repo-views'

const ALL = allAttributes()

describe('repository presets', () => {
  it('parses a preset, defaulting the sidebar settings', () => {
    expect(parsePreset({ name: ' Web ', search: '-web$' })).toEqual({
      name: 'Web',
      search: '-web$',
      tagFilter: {},
      orgFilter: {},
      viewId: '',
      attributes: ALL,
      sidebarEnabled: true,
      sidebarName: ''
    })
  })

  it('refuses what cannot be a preset', () => {
    expect(parsePreset(null)).toBeNull()
    expect(parsePreset({ name: '  ', search: '' })).toBeNull()
    expect(parsePreset({ name: 'a' })).toBeNull()
  })

  it('labels with the sidebar name when set, and encodes the route', () => {
    const preset = {
      name: 'A b',
      search: '',
      tagFilter: {},
      orgFilter: {},
      viewId: '',
      attributes: ALL,
      sidebarEnabled: true,
      sidebarName: ''
    }
    expect(presetSidebarLabel(preset)).toBe('A b')
    expect(presetSidebarLabel({ ...preset, sidebarName: 'AB' })).toBe('AB')
    expect(presetRoute('A b')).toBe('/repos/preset/A%20b')
  })
})
