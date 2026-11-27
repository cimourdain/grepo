/**
 * The Gruvbox palettes, each named by the roles of `./palette-theme.ts`: Gruvbox
 * from morhetz/gruvbox (https://github.com/morhetz/gruvbox, MIT/X11 License), with
 * its medium backgrounds, bright accents in Dark and faded accents in Light; and
 * Gruvbox Material from sainnhe/gruvbox-material
 * (https://github.com/sainnhe/gruvbox-material, MIT License), with its medium
 * background and material foreground.
 *
 * @example
 * gruvboxPalettes.dark.base // '#282828'
 */
import type { ThemePalette } from './palette-theme'

/** Every Gruvbox palette. */
export const gruvboxPalettes: Readonly<
  Record<'dark' | 'light' | 'materialDark' | 'materialLight', ThemePalette>
> = {
  dark: {
    base: '#282828',
    mantle: '#1d2021',
    crust: '#1d2021',
    surface0: '#3c3836',
    surface1: '#504945',
    surface2: '#665c54',
    overlay1: '#928374',
    subtext0: '#bdae93',
    subtext1: '#d5c4a1',
    text: '#ebdbb2',
    blue: '#83a598',
    sapphire: '#83a598',
    teal: '#8ec07c',
    green: '#b8bb26',
    yellow: '#fabd2f',
    peach: '#fe8019',
    red: '#fb4934',
    mauve: '#d3869b'
  },
  light: {
    base: '#fbf1c7',
    mantle: '#f2e5bc',
    crust: '#ebdbb2',
    surface0: '#ebdbb2',
    surface1: '#d5c4a1',
    surface2: '#bdae93',
    overlay1: '#928374',
    subtext0: '#7c6f64',
    subtext1: '#504945',
    text: '#3c3836',
    blue: '#076678',
    sapphire: '#076678',
    teal: '#427b58',
    green: '#79740e',
    yellow: '#b57614',
    peach: '#af3a03',
    red: '#9d0006',
    mauve: '#8f3f71'
  },
  materialDark: {
    base: '#282828',
    mantle: '#1b1b1b',
    crust: '#1b1b1b',
    surface0: '#45403d',
    surface1: '#5a524c',
    surface2: '#7c6f64',
    overlay1: '#928374',
    subtext0: '#a89984',
    subtext1: '#a89984',
    text: '#d4be98',
    blue: '#7daea3',
    sapphire: '#7daea3',
    teal: '#89b482',
    green: '#a9b665',
    yellow: '#d8a657',
    peach: '#e78a4e',
    red: '#ea6962',
    mauve: '#d3869b'
  },
  materialLight: {
    base: '#fbf1c7',
    mantle: '#f2e5bc',
    crust: '#f2e5bc',
    surface0: '#eee0b7',
    surface1: '#ddccab',
    surface2: '#a89984',
    overlay1: '#928374',
    subtext0: '#7c6f64',
    subtext1: '#7c6f64',
    text: '#654735',
    blue: '#45707a',
    sapphire: '#45707a',
    teal: '#4c7a5d',
    green: '#6c782e',
    yellow: '#b47109',
    peach: '#c35e0a',
    red: '#c14a4a',
    mauve: '#945e80'
  }
}
