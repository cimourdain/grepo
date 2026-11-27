import { describe, expect, it } from 'vitest'

import { automaticTagColor, isHexColor, tagColors } from './tag-colors'

describe('tag colors', () => {
  it('works a stable color out of the name, whatever its case', () => {
    expect(automaticTagColor('frontend')).toMatch(/^#[0-9A-F]{6}$/)
    expect(automaticTagColor('frontend')).toBe(automaticTagColor('FrontEnd'))
    expect(automaticTagColor('frontend')).not.toBe(automaticTagColor('backend'))
  })

  it('uses the color chosen in Settings, else the automatic one', () => {
    expect(tagColors('web', { web: '#336699' }).background).toBe('#336699')
    expect(tagColors('web', {}).background).toBe(automaticTagColor('web'))
    expect(tagColors('web', { web: 'blue' }).background).toBe(automaticTagColor('web'))
  })

  it('picks a readable text color', () => {
    expect(tagColors('x', { x: '#FFFFFF' }).foreground).toBe('#000000')
    expect(tagColors('x', { x: '#101010' }).foreground).toBe('#FFFFFF')
  })

  it('recognizes #RRGGBB colors', () => {
    expect(isHexColor('#a1B2c3')).toBe(true)
    expect(isHexColor('#abc')).toBe(false)
    expect(isHexColor(3)).toBe(false)
  })
})
