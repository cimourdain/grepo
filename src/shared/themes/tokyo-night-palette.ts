/**
 * The Tokyo Night palettes, each named by the roles of `./palette-theme.ts`, from
 * the color tables and theme files of
 * https://github.com/tokyo-night/tokyo-night-vscode-theme.
 *
 * @example
 * tokyoNightPalettes.night.base // '#1a1b26'
 */
import type { ThemePalette } from './palette-theme'

/** What Tokyo Night and its Storm variant share: text and accents. */
const nightColors = {
  overlay1: '#565f89',
  subtext0: '#9aa5ce',
  subtext1: '#a9b1d6',
  text: '#c0caf5',
  blue: '#7aa2f7',
  sapphire: '#7dcfff',
  teal: '#73daca',
  green: '#9ece6a',
  yellow: '#e0af68',
  peach: '#ff9e64',
  red: '#f7768e',
  mauve: '#bb9af7'
}

/** Every Tokyo Night palette. */
export const tokyoNightPalettes: Readonly<Record<'night' | 'storm' | 'light', ThemePalette>> = {
  night: {
    ...nightColors,
    base: '#1a1b26',
    mantle: '#16161e',
    crust: '#101014',
    surface0: '#202330',
    surface1: '#363b54',
    surface2: '#414868'
  },
  storm: {
    ...nightColors,
    base: '#24283b',
    mantle: '#1f2335',
    crust: '#1b1e2e',
    surface0: '#2c324a',
    surface1: '#3b4261',
    surface2: '#414868'
  },
  light: {
    base: '#e6e7ed',
    mantle: '#d6d8df',
    crust: '#c1c2c7',
    surface0: '#dadce3',
    surface1: '#c1c2c7',
    surface2: '#9da0ab',
    overlay1: '#6c6e75',
    subtext0: '#40434f',
    subtext1: '#363c4d',
    text: '#343b58',
    blue: '#2959aa',
    sapphire: '#006c86',
    teal: '#33635c',
    green: '#385f0d',
    yellow: '#8f5e15',
    peach: '#965027',
    red: '#8c4351',
    mauve: '#5a3e8e'
  }
}
