import { describe, expect, it } from 'vitest'

import { originUrlOf } from './git-remote'

describe('originUrlOf', () => {
  it('reads the origin remote', () => {
    const config = `[core]\n\turl = nope\n[remote "upstream"]\n\turl = git@github.com:a/up.git\n[remote "origin"]\n\turl = git@github.com:a/repo.git\n\tfetch = +refs/*\n`
    expect(originUrlOf(config)).toBe('git@github.com:a/repo.git')
  })

  it('falls back to the first remote, and to null without any', () => {
    expect(originUrlOf('[remote "fork"]\n\turl = https://github.com/x/y\n')).toBe(
      'https://github.com/x/y'
    )
    expect(originUrlOf('[core]\n\tbare = false\n')).toBeNull()
  })
})
