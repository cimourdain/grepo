/**
 * Builds a theme from a palette: every family (Catppuccin, Gruvbox, Nord, Tokyo
 * Night) names its colors by the same roles (`ThemePalette`), and each variable
 * of a theme takes the same role, following the Catppuccin style guide
 * (https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md): panes
 * in `base` and `mantle`, elements in the `surface` colors, text in `text` and the
 * `subtext` colors, links in `blue`, statuses in `green`, `yellow` and `red`.
 *
 * Roles the guide doesn't cover (a tag's background, a border in a status color)
 * are tints: a palette color mixed over `base`.
 *
 * The guide puts legibility first, and allows deviating for it. So a color used
 * for text, or under text as a solid tag, is `legible`: it stays exactly the
 * palette's unless it is too faint on what it is shown on, and is then darkened
 * (in a light theme) or lightened (in a dark one) only as far as needed, which
 * keeps its hue.
 *
 * @example
 * paletteTheme(catppuccinPalettes.mocha, 'Catppuccin Mocha', 'dark').values['--color-background'] // '#1e1e2e'
 * describePaletteRole(paletteRoles['--color-accent-surface']!) // 'blue 15% over base'
 */
import type { ThemeColorScheme, ThemeDefinition } from './theme-definition'

/** The colors a palette names by role. */
export type ThemePaletteColor =
  | 'base'
  | 'mantle'
  | 'crust'
  | 'surface0'
  | 'surface1'
  | 'surface2'
  | 'overlay1'
  | 'subtext0'
  | 'subtext1'
  | 'text'
  | 'blue'
  | 'sapphire'
  | 'teal'
  | 'green'
  | 'yellow'
  | 'peach'
  | 'red'
  | 'mauve'

/** A palette: its colors, by role. */
export type ThemePalette = Readonly<Record<ThemePaletteColor, string>>

/** The contrast text needs on what it is shown on (WCAG AA). */
const READABLE_CONTRAST = 4.5

/** The tint of a status's own background. */
const TINT_AMOUNT = 0.15

/** A variable's role: how its value comes from the palette. */
export type PaletteRole =
  | { kind: 'color'; color: ThemePaletteColor }
  | { kind: 'tint'; color: ThemePaletteColor; over: ThemePaletteColor; amount: number }
  | { kind: 'alpha'; color: ThemePaletteColor; opacity: number }
  | { kind: 'shadow' }
  | {
      kind: 'legible'
      color: ThemePaletteColor
      /** What it is shown on. */
      on: readonly ThemePaletteColor[]
      /** Its own tint it is shown on too, if any. */
      tint: number | null
      minimumContrast: number
    }

/** A palette color, as it is. */
const color = (name: ThemePaletteColor): PaletteRole => ({ kind: 'color', color: name })

/** A palette color mixed over `base`. */
const tint = (name: ThemePaletteColor, amount: number): PaletteRole => ({
  kind: 'tint',
  color: name,
  over: 'base',
  amount
})

/** A palette color kept readable on the panes and on its own tint. */
const status = (name: ThemePaletteColor): PaletteRole => ({
  kind: 'legible',
  color: name,
  on: ['base', 'mantle'],
  tint: TINT_AMOUNT,
  minimumContrast: READABLE_CONTRAST
})

/** A text color kept readable on what it is shown on. */
const legibleText = (
  name: ThemePaletteColor,
  on: readonly ThemePaletteColor[],
  minimumContrast = READABLE_CONTRAST
): PaletteRole => ({ kind: 'legible', color: name, on, tint: null, minimumContrast })

/** The role of each of the theme's variables. */
export const paletteRoles: Readonly<Record<string, PaletteRole>> = {
  '--color-background': color('base'),
  '--color-surface': color('mantle'),
  // Apart from `surface0`, or a neutral tag would vanish on a card under the pointer.
  '--color-surface-hover': { kind: 'tint', color: 'surface0', over: 'mantle', amount: 0.5 },
  '--color-surface-raised': color('surface0'),
  '--color-surface-active': color('surface1'),
  '--color-neutral-surface': color('surface0'),
  '--color-border': color('surface1'),
  '--color-border-strong': color('surface2'),
  '--color-text': color('text'),
  '--color-text-secondary': legibleText('subtext1', ['base', 'mantle', 'surface0']),
  '--color-text-muted': legibleText('subtext0', ['base', 'mantle']),
  '--color-text-subtle': legibleText('overlay1', ['base', 'mantle'], 3),
  '--color-on-accent': color('base'),
  '--color-on-solid': color('base'),
  '--color-accent': status('blue'),
  '--color-accent-surface': tint('blue', TINT_AMOUNT),
  '--color-success': status('green'),
  '--color-success-soft': color('text'),
  '--color-success-surface': tint('green', TINT_AMOUNT),
  '--color-success-border': tint('green', 0.5),
  '--color-success-strong': status('green'),
  '--color-warning': status('yellow'),
  '--color-warning-surface': tint('yellow', TINT_AMOUNT),
  '--color-danger': status('red'),
  '--color-danger-soft': color('text'),
  '--color-danger-surface': tint('red', TINT_AMOUNT),
  '--color-danger-surface-strong': tint('red', 0.25),
  '--color-danger-border': tint('red', 0.5),
  '--color-danger-strong': status('red'),
  '--color-special': status('mauve'),
  '--color-special-surface': tint('mauve', TINT_AMOUNT),
  '--color-type-anime': status('sapphire'),
  '--color-type-manga': status('peach'),
  '--color-rating-7': status('teal'),
  '--color-rating-16': status('peach'),
  '--color-rating-adult': status('mauve'),
  '--color-hero-overlay-start': { kind: 'alpha', color: 'base', opacity: 0.72 },
  '--color-hero-overlay-end': { kind: 'alpha', color: 'base', opacity: 0.95 },
  '--color-shadow': { kind: 'shadow' },
  '--color-nav-active': tint('blue', 0.25),
  '--color-on-nav-active': color('text'),
  '--color-scrollbar-thumb': color('surface2'),
  '--color-scrollbar-track': color('mantle')
}

/** A color's channels, from 0 to 255. */
type Channels = readonly [number, number, number]

/**
 * Reads a hex color.
 *
 * @param hexColor - a `#rrggbb` color.
 */
function channelsOf(hexColor: string): Channels {
  return [1, 3, 5].map((start) =>
    Number.parseInt(hexColor.slice(start, start + 2), 16)
  ) as unknown as Channels
}

/**
 * Mixes two colors.
 *
 * @param top - a `#rrggbb` color.
 * @param bottom - the color under it.
 * @param amount - how much of `top`, from 0 to 1.
 * @returns the mix, as `#rrggbb`.
 * @example
 * mixedColor('#ffffff', '#000000', 0.5) // '#808080'
 */
export function mixedColor(top: string, bottom: string, amount: number): string {
  const bottomChannels = channelsOf(bottom)
  const mixed = channelsOf(top).map((channel, index) =>
    Math.round(channel * amount + bottomChannels[index]! * (1 - amount))
  )
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Computes a color's relative luminance (WCAG).
 *
 * @param hexColor - a `#rrggbb` color.
 */
function luminanceOf(hexColor: string): number {
  const [red, green, blue] = channelsOf(hexColor).map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }) as unknown as Channels
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/**
 * Computes the contrast of two colors (WCAG).
 *
 * @param first - a `#rrggbb` color.
 * @param second - another.
 * @returns the ratio, from 1 to 21.
 * @example
 * contrastOf('#000000', '#ffffff') // 21
 */
export function contrastOf(first: string, second: string): number {
  const [lighter, darker] = [luminanceOf(first), luminanceOf(second)].sort(
    (a, b) => b - a
  ) as unknown as Channels
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Darkens or lightens a color only as far as it needs to be readable.
 *
 * @param role - the color and what it is shown on.
 * @param palette - the palette.
 * @param colorScheme - the theme's base, telling which way gains contrast.
 * @returns the color, unchanged when already readable.
 */
function legibleColor(
  role: Extract<PaletteRole, { kind: 'legible' }>,
  palette: ThemePalette,
  colorScheme: ThemeColorScheme
): string {
  const extreme = colorScheme === 'light' ? '#000000' : '#ffffff'
  const original = palette[role.color]
  const backgrounds = role.on.map((name) => palette[name])
  if (role.tint !== null) backgrounds.push(mixedColor(original, palette.base, role.tint))
  for (let amount = 1; amount > 0; amount -= 0.01) {
    const candidate = mixedColor(original, extreme, amount)
    if (backgrounds.every((back) => contrastOf(candidate, back) >= role.minimumContrast)) {
      return candidate
    }
  }
  return extreme
}

/**
 * Computes a role's value in a palette.
 *
 * @param role - the role.
 * @param palette - the palette.
 * @param colorScheme - the theme's base.
 * @returns a CSS color.
 */
function roleValue(
  role: PaletteRole,
  palette: ThemePalette,
  colorScheme: ThemeColorScheme
): string {
  switch (role.kind) {
    case 'color':
      return palette[role.color]
    case 'tint':
      return mixedColor(palette[role.color], palette[role.over], role.amount)
    case 'legible':
      return legibleColor(role, palette, colorScheme)
    case 'alpha':
      return `rgba(${channelsOf(palette[role.color]).join(', ')}, ${role.opacity})`
    case 'shadow':
      return colorScheme === 'light'
        ? `rgba(${channelsOf(palette.text).join(', ')}, 0.18)`
        : `rgba(${channelsOf(palette.crust).join(', ')}, 0.5)`
  }
}

/**
 * Says how a role comes from the palette, for the documentation.
 *
 * @param role - the role.
 * @returns e.g. `'blue 15% over base'`, `'green*'` when kept legible.
 */
export function describePaletteRole(role: PaletteRole): string {
  switch (role.kind) {
    case 'color':
      return role.color
    case 'tint':
      return `${role.color} ${Math.round(role.amount * 100)}% over ${role.over}`
    case 'legible':
      return `${role.color}*`
    case 'alpha':
      return `${role.color} at ${Math.round(role.opacity * 100)}%`
    case 'shadow':
      return 'crust at 50%, text at 18% in a light theme'
  }
}

/**
 * Builds a theme from a palette.
 *
 * @param palette - the palette.
 * @param name - the theme's name.
 * @param colorScheme - the theme's base.
 */
export function paletteTheme(
  palette: ThemePalette,
  name: string,
  colorScheme: ThemeColorScheme
): ThemeDefinition {
  return {
    name,
    colorScheme,
    values: Object.fromEntries(
      Object.entries(paletteRoles).map(([token, role]) => [
        token,
        roleValue(role, palette, colorScheme)
      ])
    )
  }
}
