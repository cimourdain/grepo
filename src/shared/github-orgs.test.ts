import { describe, expect, it } from 'vitest'

import { enabledTeams, parseCodeowners, parseSelection, teamKey } from './github-orgs'

describe('parseCodeowners', () => {
  it('lists the owners after each pattern, lower case, ignoring comments', () => {
    const text = [
      '# the owners',
      '* @Example/Web-Team',
      '/docs/ @alice bob@example.com # trailing comment',
      '',
      '*.js   @example/web-team @example/other',
      'lonely-pattern'
    ].join('\n')
    expect(parseCodeowners(text)).toEqual([
      '@example/web-team',
      '@alice',
      'bob@example.com',
      '@example/other'
    ])
  })

  it('reads an empty file', () => {
    expect(parseCodeowners('')).toEqual([])
  })
})

describe('selection', () => {
  const inspection = {
    orgs: [
      {
        login: 'Example',
        teams: [
          { slug: 'web', name: 'Web' },
          { slug: 'api', name: 'API' }
        ]
      },
      { login: 'Other', teams: [{ slug: 'ops', name: 'Ops' }] }
    ],
    inspectedAt: ''
  }

  it('enables everything by default', () => {
    expect(enabledTeams(inspection, parseSelection(null))).toEqual([
      'example/web',
      'example/api',
      'other/ops'
    ])
  })

  it('leaves out disabled teams and the teams of disabled orgs', () => {
    const selection = parseSelection({ disabledOrgs: ['OTHER'], disabledTeams: ['Example/API', 3] })
    expect(selection).toEqual({ disabledOrgs: ['other'], disabledTeams: ['example/api'] })
    expect(enabledTeams(inspection, selection)).toEqual(['example/web'])
    expect(teamKey('Example', 'Web')).toBe('example/web')
  })
})
