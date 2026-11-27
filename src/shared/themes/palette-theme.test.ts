/**
 * Tests for building themes from palettes (`./palette-theme.ts`): every family's
 * palette follows the roles, tints, and colors staying the palette's unless too
 * faint to read.
 */
import { describe, expect, it } from 'vitest'

import { APP_BACKGROUND_COLOR } from '../app-theme'
import { catppuccinPalettes } from './catppuccin-palette'
import { gruvboxPalettes } from './gruvbox-palette'
import { nordPalettes } from './nord-palette'
import {
  contrastOf,
  describePaletteRole,
  paletteRoles,
  paletteTheme,
  type ThemePalette
} from './palette-theme'
import { tokyoNightPalettes } from './tokyo-night-palette'

const palettes: Array<[string, ThemePalette, 'dark' | 'light']> = [
  ['Catppuccin Latte', catppuccinPalettes.latte, 'light'],
  ['Catppuccin Frappé', catppuccinPalettes.frappe, 'dark'],
  ['Catppuccin Macchiato', catppuccinPalettes.macchiato, 'dark'],
  ['Catppuccin Mocha', catppuccinPalettes.mocha, 'dark'],
  ['Gruvbox Dark', gruvboxPalettes.dark, 'dark'],
  ['Gruvbox Light', gruvboxPalettes.light, 'light'],
  ['Gruvbox Material Dark', gruvboxPalettes.materialDark, 'dark'],
  ['Gruvbox Material Light', gruvboxPalettes.materialLight, 'light'],
  ['Nord Polar Night', nordPalettes.polarNight, 'dark'],
  ['Nord Snow Storm', nordPalettes.snowStorm, 'light'],
  ['Nord Frost', nordPalettes.frost, 'dark'],
  ['Nord Aurora', nordPalettes.aurora, 'dark'],
  ['Tokyo Night', tokyoNightPalettes.night, 'dark'],
  ['Tokyo Night Storm', tokyoNightPalettes.storm, 'dark'],
  ['Tokyo Night Light', tokyoNightPalettes.light, 'light']
]

describe.each(palettes)('the %s theme', (name, palette, colorScheme) => {
  const { values } = paletteTheme(palette, name, colorScheme)

  it('follows the roles', () => {
    expect(values['--color-background']).toBe(palette.base)
    expect(values['--color-surface']).toBe(palette.mantle)
    expect(values['--color-text']).toBe(palette.text)
    expect(values['--color-on-accent']).toBe(palette.base)
    expect(values['--color-surface-raised']).toBe(palette.surface0)
  })

  it('keeps neutral tags visible on a card under the pointer', () => {
    expect(values['--color-surface-hover']).not.toBe(values['--color-neutral-surface'])
  })

  it('only uses hex colors or a palette color with opacity', () => {
    for (const [token, value] of Object.entries(values)) {
      expect(value, token).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/)
    }
  })

  it('keeps every legible color readable on what it is shown on', () => {
    for (const [token, role] of Object.entries(paletteRoles)) {
      if (role.kind !== 'legible') continue
      for (const background of role.on) {
        expect(
          contrastOf(values[token]!, palette[background]),
          `${token} on ${background}`
        ).toBeGreaterThanOrEqual(role.minimumContrast)
      }
    }
  })

  it('tells its themes’ base by its background', () => {
    const backgroundIsLight =
      contrastOf(palette.base, '#ffffff') < contrastOf(palette.base, '#000000')

    expect(backgroundIsLight).toBe(colorScheme === 'light')
  })
})

describe('the palette’s colors', () => {
  it.each(['macchiato', 'mocha'] as const)('are used untouched in Catppuccin %s', (flavor) => {
    const palette = catppuccinPalettes[flavor]
    const { values } = paletteTheme(palette, flavor, 'dark')

    for (const [token, role] of Object.entries(paletteRoles)) {
      if (role.kind === 'legible') expect(values[token], token).toBe(palette[role.color])
    }
  })

  it('are darkened in Latte only when too faint, keeping their hue', () => {
    const { latte } = catppuccinPalettes
    const { values } = paletteTheme(latte, 'Latte', 'light')

    expect(contrastOf(latte.yellow, latte.base)).toBeLessThan(4.5)
    expect(values['--color-warning']).toBe('#8c5912')
    expect(contrastOf(values['--color-warning']!, latte.base)).toBeGreaterThanOrEqual(4.5)
    expect(values['--color-success']).toBe('#2d721f')
    expect(values['--color-text']).toBe(latte.text)
  })

  it('give the native window the default theme’s background', () => {
    expect(APP_BACKGROUND_COLOR).toBe(catppuccinPalettes.mocha.base)
  })
})

describe('Nord’s themes', () => {
  it('differ, though Frost and Aurora build on Polar Night', () => {
    const { polarNight, frost, aurora } = nordPalettes

    expect(frost.base).not.toBe(polarNight.base)
    expect(frost.blue).toBe(polarNight.blue)
    expect(aurora.base).toBe(polarNight.base)
    expect(aurora.blue).toBe('#b48ead')
  })
})

describe('describePaletteRole', () => {
  it('says how a role comes from the palette', () => {
    expect(describePaletteRole(paletteRoles['--color-background']!)).toBe('base')
    expect(describePaletteRole(paletteRoles['--color-accent-surface']!)).toBe('blue 15% over base')
    expect(describePaletteRole(paletteRoles['--color-warning']!)).toBe('yellow*')
    expect(describePaletteRole(paletteRoles['--color-hero-overlay-end']!)).toBe('base at 95%')
  })
})
