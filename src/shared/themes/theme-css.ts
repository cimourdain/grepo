/**
 * Writes an included theme as CSS: `themeVariablesCss` for the renderer to
 * apply, `themeSourceOf` as the commented code a new custom theme starts from.
 *
 * @example
 * themeVariablesCss(includedThemes.dark) // ':root {\n  color-scheme: dark;\n  --color-background: #11131a;\n…'
 */
import type { ThemeDefinition } from './included-themes'
import { themeTokenGroups, themeTokens } from './theme-tokens'

/**
 * Writes a theme's variables as a `:root` rule.
 *
 * @param theme - the theme.
 * @returns the CSS.
 */
export function themeVariablesCss(theme: ThemeDefinition): string {
  const declarations = themeTokens.map((token) => `  ${token}: ${theme.values[token]};`)
  return `:root {\n  color-scheme: ${theme.colorScheme};\n${declarations.join('\n')}\n}\n`
}

/**
 * Writes a theme as readable SCSS, valid as a custom theme's definition.
 *
 * @param theme - the theme.
 * @returns the code, with a comment above each group of variables.
 */
export function themeSourceOf(theme: ThemeDefinition): string {
  const groups = themeTokenGroups.map((group) =>
    [
      `  // ${group.label}`,
      ...Object.keys(group.tokens).map((token) => `  ${token}: ${theme.values[token]};`)
    ].join('\n')
  )
  return `:root {\n  color-scheme: ${theme.colorScheme};\n\n${groups.join('\n\n')}\n}\n`
}
