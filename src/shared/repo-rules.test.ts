import { describe, expect, it } from 'vitest'

import {
  applyNamingRules,
  cleanTextOf,
  parseRepoRules,
  splitTags,
  tagsOf,
  type TagRule,
  type TagRuleTarget,
  validateRepoRules,
  type NamingRule
} from './repo-rules'

const NAME = 'shop-checkout-payment-pay-landingpage'
const pay: NamingRule = {
  search: 'checkout-payment',
  type: 'text',
  value: 'Pay'
}
const icon: NamingRule = {
  search: '^shop-',
  type: 'image',
  value: '/pics/sl.png'
}

describe('applyNamingRules', () => {
  it('cleans the name without rules', () => {
    expect(applyNamingRules('my_repo-name', [])).toEqual([{ type: 'text', text: 'My Repo Name' }])
  })

  it('replaces a match by a text', () => {
    expect(cleanTextOf(applyNamingRules(NAME, [pay]))).toBe('Shop Pay Pay Landingpage')
  })

  it('replaces a match by an image', () => {
    expect(applyNamingRules(NAME, [icon])).toEqual([
      { type: 'image', path: '/pics/sl.png', src: null },
      { type: 'text', text: 'Checkout Payment Pay Landingpage' }
    ])
  })

  it('chains the rules in order', () => {
    const parts = applyNamingRules(NAME, [pay, icon])
    expect(parts).toEqual([
      { type: 'image', path: '/pics/sl.png', src: null },
      { type: 'text', text: 'Pay Pay Landingpage' }
    ])
    expect(cleanTextOf(parts)).toBe('Pay Pay Landingpage')
  })

  it('supports groups, is case-insensitive and skips invalid or empty rules', () => {
    const rules: NamingRule[] = [
      { search: '(\\w+)-(\\w+)', type: 'text', value: '$2 $1' },
      { search: '(', type: 'text', value: 'x' },
      { search: '', type: 'text', value: 'y' }
    ]
    expect(cleanTextOf(applyNamingRules('AB-cd-ef', rules))).toBe('Cd AB Ef')
  })

  it('applies to the name alone, never to the org', () => {
    // An org-looking query finds nothing: the rules only see the repository name.
    expect(
      cleanTextOf(applyNamingRules('api', [{ search: '^example/', type: 'text', value: 'X' }]))
    ).toBe('Api')
  })

  it('can put an image in the middle of a name', () => {
    expect(
      applyNamingRules('a-mid-b', [{ search: 'mid', type: 'image', value: 'i.png' }]).map(
        (part) => part.type
      )
    ).toEqual(['text', 'image', 'text'])
  })
})

describe('tagsOf', () => {
  const rules: TagRule[] = [
    { search: '-web$', tags: ['frontend', 'web'], target: 'name' },
    { search: '^shop', tags: ['web', 'shop'], target: 'name' },
    { search: '(', tags: ['never'], target: 'name' }
  ]

  it('gives the tags of every matching rule, once', () => {
    expect(
      tagsOf(
        { folderName: 'shop-site-web', realName: 'shop-site-web', path: '/w/x', github: null },
        rules
      )
    ).toEqual(['frontend', 'web', 'shop'])
  })

  it('tests the target of each rule: name, org/name, org or local path', () => {
    const repository = {
      folderName: 'site',
      realName: 'shop/site',
      path: '/home/me/code/team/site',
      github: { host: 'github.com', org: 'shop', name: 'site' }
    }
    const rule = (search: string, target: TagRuleTarget, tag: string): TagRule => ({
      search,
      tags: [tag],
      target
    })
    expect(tagsOf(repository, [rule('^site$', 'name', 'a'), rule('^shop/', 'name', 'x')])).toEqual([
      'a'
    ])
    expect(
      tagsOf(repository, [rule('^shop/site$', 'org-name', 'b'), rule('^site$', 'org-name', 'x')])
    ).toEqual(['b'])
    expect(tagsOf(repository, [rule('^shop$', 'org', 'c'), rule('site', 'org', 'x')])).toEqual([
      'c'
    ])
    expect(tagsOf(repository, [rule('/team/', 'path', 'd'), rule('^site', 'path', 'x')])).toEqual([
      'd'
    ])
  })

  it('has no org without a GitHub remote', () => {
    const repository = { folderName: 'local', realName: 'local', path: '/w/local', github: null }
    expect(tagsOf(repository, [{ search: '^$', tags: ['no-org'], target: 'org' }])).toEqual([
      'no-org'
    ])
    expect(tagsOf(repository, [{ search: '^local$', tags: ['n'], target: 'org-name' }])).toEqual([
      'n'
    ])
  })
})

describe('rules parsing and validation', () => {
  it('parses what is saved, dropping what is malformed', () => {
    const rules = parseRepoRules({
      namingRules: [{ search: 'a', type: 'image', value: 'p' }, { search: 1 }, null],
      tagRules: [
        { search: 'b', tags: [' x ', 'x', '', 3], target: 'path' },
        { search: 'c', tags: ['y'], includeOrg: true }, // saved with the former checkbox
        { search: 'd', tags: ['z'], target: 'nope' },
        { tags: [] }
      ],
      tagColors: { x: '#abcdef', y: 'red', z: 3 }
    })
    expect(rules).toEqual({
      namingRules: [{ search: 'a', type: 'image', value: 'p' }],
      tagRules: [
        { search: 'b', tags: ['x'], target: 'path' },
        { search: 'c', tags: ['y'], target: 'org-name' },
        { search: 'd', tags: ['z'], target: 'name' }
      ],
      tagColors: { x: '#ABCDEF' }
    })
    expect(parseRepoRules(null)).toEqual({ namingRules: [], tagRules: [], tagColors: {} })
  })

  it('splits tags typed with commas', () => {
    expect(splitTags('a, b ,,a')).toEqual(['a', 'b'])
  })

  it('explains the first fault', () => {
    const ok = {
      namingRules: [pay],
      tagRules: [{ search: 'x', tags: ['t'], target: 'name' as const }],
      tagColors: {}
    }
    expect(validateRepoRules(ok)).toBe('')
    expect(validateRepoRules({ ...ok, namingRules: [{ ...pay, search: '(' }] })).toMatch(
      /Naming rule 1/
    )
    expect(validateRepoRules({ ...ok, namingRules: [{ ...pay, search: ' ' }] })).toMatch(/empty/)
    expect(validateRepoRules({ ...ok, namingRules: [{ ...icon, value: '' }] })).toMatch(
      /choose an image/
    )
    expect(
      validateRepoRules({ ...ok, tagRules: [{ search: 'x', tags: [], target: 'name' as const }] })
    ).toMatch(/Tag rule 1/)
  })
})
