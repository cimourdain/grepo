/**
 * What a full theme is, apart from any theme so that the themes' modules can
 * share it.
 *
 * @example
 * const theme: ThemeDefinition = { name: 'Mine', colorScheme: 'dark', values: {} }
 */

/** A theme's base: what the browser's own controls and scrollbars follow. */
export type ThemeColorScheme = 'dark' | 'light'

/** A full theme. */
export interface ThemeDefinition {
  /** Its name, as shown. */
  name: string
  colorScheme: ThemeColorScheme
  /** Every variable's value. */
  values: Readonly<Record<string, string>>
}
