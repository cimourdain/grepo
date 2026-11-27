/**
 * Unit tests for the tri-state filter facet logic.
 *
 * Pure functions under test — no component is mounted.
 */
import { describe, expect, it } from 'vitest'

import { nextTriStateValue, passesTriStateFacet, withTriStateValue } from './tri-state-facet'

/** Matcher for a serie tagged `Action` and `Drama`. */
const matchesActionDramaSerie = (tag: string): boolean => ['Action', 'Drama'].includes(tag)

describe('nextTriStateValue', () => {
  it('cycles un-set → only → exclude → un-set', () => {
    expect(nextTriStateValue(undefined)).toBe('only')
    expect(nextTriStateValue('only')).toBe('exclude')
    expect(nextTriStateValue('exclude')).toBeUndefined()
  })
})

describe('withTriStateValue', () => {
  it('sets a value without mutating the original state', () => {
    const originalState = {}
    expect(withTriStateValue(originalState, 'Action', 'only')).toEqual({ Action: 'only' })
    expect(originalState).toEqual({})
  })

  it('removes the key when the value becomes un-set', () => {
    expect(withTriStateValue({ Action: 'exclude' }, 'Action', undefined)).toEqual({})
  })
})

describe('passesTriStateFacet', () => {
  it('applies no filtering when no value is included or excluded', () => {
    expect(passesTriStateFacet({}, matchesActionDramaSerie)).toBe(true)
  })

  it('keeps series matching at least one included value', () => {
    expect(passesTriStateFacet({ Action: 'only', Drama: 'only' }, matchesActionDramaSerie)).toBe(
      true
    )
    expect(passesTriStateFacet({ Action: 'only', Comedy: 'only' }, matchesActionDramaSerie)).toBe(
      true
    )
    expect(passesTriStateFacet({ Comedy: 'only' }, matchesActionDramaSerie)).toBe(false)
    expect(passesTriStateFacet({ Comedy: 'only', Horror: 'only' }, matchesActionDramaSerie)).toBe(
      false
    )
  })

  it('keeps all series but those matching at least one excluded value', () => {
    expect(passesTriStateFacet({ Drama: 'exclude' }, matchesActionDramaSerie)).toBe(false)
    expect(
      passesTriStateFacet({ Comedy: 'exclude', Drama: 'exclude' }, matchesActionDramaSerie)
    ).toBe(false)
    expect(passesTriStateFacet({ Comedy: 'exclude' }, matchesActionDramaSerie)).toBe(true)
  })

  it('needs an included value and no excluded one when both are set', () => {
    expect(passesTriStateFacet({ Action: 'only', Drama: 'exclude' }, matchesActionDramaSerie)).toBe(
      false
    )
    expect(
      passesTriStateFacet({ Action: 'only', Comedy: 'exclude' }, matchesActionDramaSerie)
    ).toBe(true)
    expect(
      passesTriStateFacet({ Comedy: 'only', Horror: 'exclude' }, matchesActionDramaSerie)
    ).toBe(false)
    expect(
      passesTriStateFacet(
        { Comedy: 'only', Action: 'only', Horror: 'exclude' },
        matchesActionDramaSerie
      )
    ).toBe(true)
  })
})
