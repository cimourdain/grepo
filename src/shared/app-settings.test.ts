import { describe, expect, it } from 'vitest'

import { expandPath, isAbsolutePath, parseColorTheme } from './app-settings'

describe('expandPath', () => {
  it.each([
    ['${HOME}/code', '/home/me/code'],
    ['${HOME}', '/home/me'],
    ['$HOME/code', '/home/me/code'],
    ['~/code', '/home/me/code'],
    ['~', '/home/me'],
    ['~\\code', '/home/me\\code'],
    ['  /srv/repos ', '/srv/repos'],
    ['/a/~b', '/a/~b']
  ])('expands %s', (input, expected) => {
    expect(expandPath(input, '/home/me')).toBe(expected)
  })
})

describe('parseColorTheme', () => {
  it('accepts included themes only', () => {
    expect(parseColorTheme('nord-frost')).toBe('nord-frost')
    expect(parseColorTheme('sepia')).toBeNull()
    expect(parseColorTheme(3)).toBeNull()
  })
})

describe('isAbsolutePath', () => {
  it.each([
    '/home/me',
    '/',
    'C:\\Sites\\repo',
    'c:/Sites/repo',
    'D:\\',
    '\\\\server\\share\\repos'
  ])('accepts %s', (path) => {
    expect(isAbsolutePath(path)).toBe(true)
  })

  it.each(['', 'relative/dir', './here', '..\\up', 'repos', 'C:', 'C:relative', '~/code'])(
    'refuses %s',
    (path) => {
      expect(isAbsolutePath(path)).toBe(false)
    }
  )
})
