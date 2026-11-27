/**
 * The themes shipped with the app, each a full set of the theme's variables
 * (`./theme-tokens.ts`): Light, then the Catppuccin, Gruvbox, Nord and Tokyo Night
 * families, built from their palettes (`./palette-theme.ts`).
 *
 * @example
 * includedThemes.light.values['--color-text'] // '#1a1c27'
 * includedThemeChoices.map((choice) => choice.name)[0] // 'Light'
 */
import { colorThemes, type ColorTheme } from '../app-settings'
import { catppuccinPalettes } from './catppuccin-palette'
import { gruvboxPalettes } from './gruvbox-palette'
import { nordPalettes } from './nord-palette'
import { paletteTheme } from './palette-theme'
import type { ThemeDefinition } from './theme-definition'
import { tokyoNightPalettes } from './tokyo-night-palette'

export type { ThemeColorScheme, ThemeDefinition } from './theme-definition'

/** The included themes. */
export const includedThemes: Readonly<Record<ColorTheme, ThemeDefinition>> = {
  light: {
    name: 'Light',
    colorScheme: 'light',
    values: {
      '--color-background': '#f4f5f9',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#eef0f6',
      '--color-surface-raised': '#e9ebf3',
      '--color-surface-active': '#dfe2ec',
      '--color-neutral-surface': '#e3e5ef',
      '--color-border': '#d5d8e4',
      '--color-border-strong': '#a9aec4',
      '--color-text': '#1a1c27',
      '--color-text-secondary': '#3a3d50',
      '--color-text-muted': '#5a5d6e',
      '--color-text-subtle': '#666a80',
      '--color-on-accent': '#ffffff',
      '--color-on-solid': '#ffffff',
      '--color-accent': '#1b62ad',
      '--color-accent-surface': '#d7e7f8',
      '--color-success': '#12774a',
      '--color-success-soft': '#0c5a37',
      '--color-success-surface': '#d3f0e0',
      '--color-success-border': '#7dbd9a',
      '--color-success-strong': '#1f8a4c',
      '--color-warning': '#8a6200',
      '--color-warning-surface': '#f8ecc8',
      '--color-danger': '#bf2f2f',
      '--color-danger-soft': '#8f1f1f',
      '--color-danger-surface': '#fbe3e3',
      '--color-danger-surface-strong': '#f5c8c8',
      '--color-danger-border': '#e3a6a6',
      '--color-danger-strong': '#c93a3a',
      '--color-special': '#7b3fb0',
      '--color-special-surface': '#eddff8',
      '--color-type-anime': '#1b62ad',
      '--color-type-manga': '#b85a14',
      '--color-rating-7': '#477d19',
      '--color-rating-16': '#b85a14',
      '--color-rating-adult': '#8c2f39',
      '--color-hero-overlay-start': 'rgba(244, 245, 249, 0.72)',
      '--color-hero-overlay-end': 'rgba(244, 245, 249, 0.95)',
      '--color-shadow': 'rgba(20, 24, 40, 0.18)',
      '--color-nav-active': '#cfe2f7',
      '--color-on-nav-active': '#10355e',
      '--color-scrollbar-thumb': '#a9aec4',
      '--color-scrollbar-track': '#eef0f6'
    }
  },
  'catppuccin-latte': paletteTheme(catppuccinPalettes.latte, 'Catppuccin Latte', 'light'),
  'catppuccin-frappe': paletteTheme(catppuccinPalettes.frappe, 'Catppuccin Frappé', 'dark'),
  'catppuccin-macchiato': paletteTheme(
    catppuccinPalettes.macchiato,
    'Catppuccin Macchiato',
    'dark'
  ),
  'catppuccin-mocha': paletteTheme(catppuccinPalettes.mocha, 'Catppuccin Mocha', 'dark'),
  'gruvbox-dark': paletteTheme(gruvboxPalettes.dark, 'Gruvbox Dark', 'dark'),
  'gruvbox-light': paletteTheme(gruvboxPalettes.light, 'Gruvbox Light', 'light'),
  'gruvbox-material-dark': paletteTheme(
    gruvboxPalettes.materialDark,
    'Gruvbox Material Dark',
    'dark'
  ),
  'gruvbox-material-light': paletteTheme(
    gruvboxPalettes.materialLight,
    'Gruvbox Material Light',
    'light'
  ),
  'nord-polar-night': paletteTheme(nordPalettes.polarNight, 'Nord Polar Night', 'dark'),
  'nord-snow-storm': paletteTheme(nordPalettes.snowStorm, 'Nord Snow Storm', 'light'),
  'nord-frost': paletteTheme(nordPalettes.frost, 'Nord Frost', 'dark'),
  'nord-aurora': paletteTheme(nordPalettes.aurora, 'Nord Aurora', 'dark'),
  'tokyo-night': paletteTheme(tokyoNightPalettes.night, 'Tokyo Night', 'dark'),
  'tokyo-night-storm': paletteTheme(tokyoNightPalettes.storm, 'Tokyo Night Storm', 'dark'),
  'tokyo-night-light': paletteTheme(tokyoNightPalettes.light, 'Tokyo Night Light', 'light')
}

/** An included theme as offered in Settings. */
export interface IncludedThemeChoice {
  key: ColorTheme
  name: string
  description: string
}

/** What Settings says of each included theme. */
const themeDescriptions: Readonly<Record<ColorTheme, string>> = {
  light: 'Dark text on light surfaces.',
  'catppuccin-latte': 'Catppuccin’s light flavor.',
  'catppuccin-frappe': 'Catppuccin’s lightest dark flavor.',
  'catppuccin-macchiato': 'Catppuccin’s medium dark flavor.',
  'catppuccin-mocha': 'Catppuccin’s darkest flavor. The default.',
  'gruvbox-dark': 'Retro warm colors on charcoal.',
  'gruvbox-light': 'Retro warm colors on cream.',
  'gruvbox-material-dark': 'Gruvbox softened, on charcoal.',
  'gruvbox-material-light': 'Gruvbox softened, on cream.',
  'nord-polar-night': 'Arctic blues on dark slate.',
  'nord-snow-storm': 'Arctic blues on snowy white.',
  'nord-frost': 'Polar Night in colder blues.',
  'nord-aurora': 'Polar Night led by the northern lights’ purple.',
  'tokyo-night': 'Neon accents on deep navy.',
  'tokyo-night-storm': 'Neon accents on a lighter navy.',
  'tokyo-night-light': 'Muted accents on cool grey.'
}

/** The included themes, in display order. */
export const includedThemeChoices: readonly IncludedThemeChoice[] = colorThemes.map((key) => ({
  key,
  name: includedThemes[key].name,
  description: themeDescriptions[key]
}))
