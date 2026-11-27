import { describe, expect, it } from 'vitest'

import {
  allAttributes,
  DEFAULT_VIEW,
  parseRepoViews,
  parseViewAttributes,
  resolveView,
  validateRepoViews
} from './repo-views'

describe('repo views', () => {
  it('starts with the default view, made from the original style', () => {
    expect(parseRepoViews(null)).toEqual({ views: [DEFAULT_VIEW], defaultId: 'default' })
    expect(DEFAULT_VIEW).toMatchObject({ fontSize: 16, minItemWidth: 300 })
  })

  it('parses views, clamping numbers and dropping the malformed or duplicated', () => {
    const config = parseRepoViews({
      views: [
        { id: 'a', name: ' A ', fontSize: 100, minItemWidth: 'wide' },
        { id: 'a', name: 'Dup', fontSize: 12, minItemWidth: 200 },
        { id: '', name: 'No id' },
        { id: 'b', name: 'B', fontSize: 4, minItemWidth: 5000 }
      ],
      defaultId: 'missing'
    })
    expect(config).toEqual({
      views: [
        { id: 'a', name: 'A', fontSize: 32, minItemWidth: 300 },
        { id: 'b', name: 'B', fontSize: 8, minItemWidth: 800 }
      ],
      defaultId: 'a'
    })
  })

  it('validates names and the default', () => {
    const view = (
      id: string,
      name: string
    ): { id: string; name: string; fontSize: number; minItemWidth: number } => ({
      id,
      name,
      fontSize: 16,
      minItemWidth: 300
    })
    expect(validateRepoViews({ views: [view('a', 'A')], defaultId: 'a' })).toBe('')
    expect(validateRepoViews({ views: [], defaultId: 'a' })).toMatch(/at least one/)
    expect(validateRepoViews({ views: [view('a', ' ')], defaultId: 'a' })).toMatch(/name/)
    expect(validateRepoViews({ views: [view('a', 'X'), view('b', 'x')], defaultId: 'a' })).toMatch(
      /Two views/
    )
    expect(validateRepoViews({ views: [view('a', 'A')], defaultId: 'z' })).toMatch(/default/)
  })

  it('resolves an unknown or empty id to the default view', () => {
    const config = parseRepoViews({
      views: [
        { id: 'a', name: 'A', fontSize: 10, minItemWidth: 200 },
        { id: 'b', name: 'B', fontSize: 12, minItemWidth: 250 }
      ],
      defaultId: 'b'
    })
    expect(resolveView(config, 'a').name).toBe('A')
    expect(resolveView(config, '').name).toBe('B')
    expect(resolveView(config, 'gone').name).toBe('B')
  })

  it('shows every attribute unless it is false', () => {
    expect(parseViewAttributes(undefined)).toEqual(allAttributes())
    expect(parseViewAttributes({ tags: false, org: 'no' })).toEqual({
      org: true,
      name: true,
      tags: false,
      buttons: true
    })
  })
})
