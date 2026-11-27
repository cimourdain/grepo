import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ConfigLocation } from '../config/config-location'
import { ViewsStore } from './views-store'

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'grepo-views-'))
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('ViewsStore', () => {
  it('reads the default view first, then saves valid views and refuses invalid ones', () => {
    const store = new ViewsStore(new ConfigLocation(home))
    expect(store.read().defaultId).toBe('default')
    const config = {
      views: [
        { id: 'default', name: 'Default', fontSize: 16, minItemWidth: 300 },
        { id: 'small', name: 'Small', fontSize: 12, minItemWidth: 200 }
      ],
      defaultId: 'small'
    }
    expect(store.write(config)).toEqual({ success: true })
    expect(store.read()).toEqual(config)
    expect(store.write({ views: [], defaultId: 'x' })).toEqual({ success: true })
    expect(
      store.write({ ...config, views: [config.views[0], { ...config.views[0]!, id: 'b' }] })
    ).toMatchObject({
      success: false
    })
    expect(store.read().defaultId).toBe('default')
  })
})
