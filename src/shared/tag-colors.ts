/**
 * The colors of tags. A tag's color is the one defined in Settings → Repos (after the tag rules),
 * else one worked out from its name: the same name always gives the same color.
 *
 * @example
 * tagColors('frontend', {}) // { background: '#…', foreground: '#FFFFFF' }
 * tagColors('frontend', { frontend: '#336699' }).background // '#336699'
 */
import { foregroundOn, hslToHex } from './color'

/** The colors of a tag chip. */
export interface TagColors {
  background: string
  foreground: string
}

/** Matches a `#RRGGBB` color. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/**
 * Tells whether a value is a `#RRGGBB` color.
 *
 * @param value - the value (untrusted).
 */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

/**
 * Works out a color from a tag's name: its hash gives the hue.
 *
 * @param tag - the tag.
 * @returns a `#RRGGBB` color, dark enough for light text.
 */
export function automaticTagColor(tag: string): string {
  let hash = 0
  for (const character of tag.toLowerCase()) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return hslToHex(hash % 360, 0.5, 0.4)
}

/**
 * Gives the colors of a tag.
 *
 * @param tag - the tag.
 * @param overrides - the colors defined in Settings, by tag.
 */
export function tagColors(tag: string, overrides: Readonly<Record<string, string>>): TagColors {
  const background = isHexColor(overrides[tag])
    ? overrides[tag].toUpperCase()
    : automaticTagColor(tag)
  return { background, foreground: foregroundOn(background) }
}
