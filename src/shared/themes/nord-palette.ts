/**
 * The Nord themes' palettes, named by the roles of `./palette-theme.ts`, from the
 * 16 colors of https://www.nordtheme.com (MIT License).
 *
 * Nord is one palette of four color groups, not four themes, so each group gives
 * a theme its character:
 * - Polar Night is the dark base, with Frost accents and Aurora statuses.
 * - Snow Storm is the light base, with Polar Night text. It only has three
 *   colors, so its darker surfaces mix `nord4` with `nord3`.
 * - Frost only holds accents: this theme is Polar Night with its surfaces tinted
 *   by `nord10`, for a colder look, and `nord8` and `nord7` leading.
 * - Aurora only holds accents too: this theme is Polar Night led by `nord15`.
 *
 * @example
 * nordPalettes.polarNight.base // '#2e3440'
 */
import { mixedColor, type ThemePalette } from './palette-theme'

/** The Nord colors, by their official names. */
const nord = {
  nord0: '#2e3440',
  nord1: '#3b4252',
  nord2: '#434c5e',
  nord3: '#4c566a',
  nord4: '#d8dee9',
  nord5: '#e5e9f0',
  nord6: '#eceff4',
  nord7: '#8fbcbb',
  nord8: '#88c0d0',
  nord9: '#81a1c1',
  nord10: '#5e81ac',
  nord11: '#bf616a',
  nord12: '#d08770',
  nord13: '#ebcb8b',
  nord14: '#a3be8c',
  nord15: '#b48ead'
} as const

/** How much of `nord10` tints the Frost theme's surfaces. */
const FROST_TINT = 0.15

/** The Polar Night base, with Frost accents and Aurora statuses. */
const polarNight: ThemePalette = {
  base: nord.nord0,
  mantle: nord.nord1,
  crust: nord.nord0,
  surface0: nord.nord2,
  surface1: nord.nord3,
  surface2: nord.nord3,
  overlay1: nord.nord3,
  subtext0: nord.nord4,
  subtext1: nord.nord5,
  text: nord.nord6,
  blue: nord.nord8,
  sapphire: nord.nord9,
  teal: nord.nord7,
  green: nord.nord14,
  yellow: nord.nord13,
  peach: nord.nord12,
  red: nord.nord11,
  mauve: nord.nord15
}

/** Tints a Polar Night color with `nord10`. */
const frosted = (color: string): string => mixedColor(nord.nord10, color, FROST_TINT)

/** Every Nord theme's palette. */
export const nordPalettes: Readonly<
  Record<'polarNight' | 'snowStorm' | 'frost' | 'aurora', ThemePalette>
> = {
  polarNight,
  snowStorm: {
    base: nord.nord6,
    mantle: nord.nord5,
    crust: nord.nord4,
    surface0: nord.nord4,
    surface1: mixedColor(nord.nord3, nord.nord4, 0.2),
    surface2: mixedColor(nord.nord3, nord.nord4, 0.4),
    overlay1: nord.nord3,
    subtext0: nord.nord3,
    subtext1: nord.nord2,
    text: nord.nord0,
    blue: nord.nord10,
    sapphire: nord.nord9,
    teal: nord.nord7,
    green: nord.nord14,
    yellow: nord.nord13,
    peach: nord.nord12,
    red: nord.nord11,
    mauve: nord.nord15
  },
  frost: {
    ...polarNight,
    base: frosted(nord.nord0),
    mantle: frosted(nord.nord1),
    crust: frosted(nord.nord0),
    surface0: frosted(nord.nord2),
    surface1: frosted(nord.nord3),
    surface2: frosted(nord.nord3),
    sapphire: nord.nord7
  },
  aurora: {
    ...polarNight,
    blue: nord.nord15,
    sapphire: nord.nord12,
    mauve: nord.nord8
  }
}
