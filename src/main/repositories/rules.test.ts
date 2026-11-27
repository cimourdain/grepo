import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Repository } from '../../shared/repository'
import { ConfigLocation } from '../config/config-location'
import { decorateInventory } from './decorate-repositories'
import { ImageLoader } from './image-loader'
import { RulesStore } from './rules-store'

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'grepo-rules-'))
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('RulesStore', () => {
  it('saves valid rules and refuses invalid ones', () => {
    const store = new RulesStore(new ConfigLocation(home))
    expect(store.read()).toEqual({ namingRules: [], tagRules: [], tagColors: {} })
    const rules = {
      namingRules: [{ search: '^a', type: 'text', value: 'B' }],
      tagRules: [{ search: 'x', tags: ['t'], target: 'org' }],
      tagColors: { t: '#112233' }
    }
    expect(store.write(rules)).toEqual({ success: true })
    expect(store.read()).toEqual(rules)
    expect(store.write({ namingRules: [{ search: '(', type: 'text', value: '' }] })).toMatchObject({
      success: false
    })
    expect(store.read()).toEqual(rules)
  })
})

describe('ImageLoader', () => {
  it('reads an image as a data URL, and refuses what is not one', () => {
    writeFileSync(join(home, 'a.png'), Buffer.from([1, 2, 3]))
    writeFileSync(join(home, 'a.txt'), 'x')
    const loader = new ImageLoader(home)
    expect(loader.load('${HOME}/a.png')).toBe('data:image/png;base64,AQID')
    expect(loader.load(join(home, 'a.txt'))).toBeNull()
    expect(loader.load(join(home, 'missing.png'))).toBeNull()
  })
})

describe('decorateInventory', () => {
  it('gives names (with image data) and tags from the rules', () => {
    writeFileSync(join(home, 'sl.png'), Buffer.from([1]))
    const repository: Repository = {
      folderName: 'shop-checkout-payment-web',
      cleanName: 'x',
      cleanParts: [],
      tags: [],
      realName: 'example/shop-checkout-payment-web',
      path: '/w/x',
      remoteUrl: null,
      github: null,
      hasCircleci: false
    }
    const inventory = decorateInventory(
      { repositories: [repository], scannedPaths: ['/w'], scannedAt: '' },
      {
        namingRules: [
          { search: 'checkout-payment', type: 'text', value: 'Pay' },
          { search: '^shop-', type: 'image', value: join(home, 'sl.png') }
        ],
        tagRules: [{ search: '-web$', tags: ['frontend'], target: 'name' }],
        tagColors: {}
      },
      new ImageLoader(home)
    )
    const [decorated] = inventory.repositories
    expect(decorated!.cleanName).toBe('Pay Web')
    expect(decorated!.cleanParts[0]).toMatchObject({
      type: 'image',
      src: 'data:image/png;base64,AQ=='
    })
    expect(decorated!.tags).toEqual(['frontend'])
  })
})
