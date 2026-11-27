/**
 * The theme's variables: every CSS custom property the renderer's styles read
 * for a color, grouped and described. It is the single list of what a theme can
 * set: the included themes define all of them (`./included-themes.ts`), a custom
 * theme is checked against it (`src/main/themes/compile-theme-source.ts`), and
 * the documentation lists it (`docs/en/contributing/theme.md`).
 *
 * @example
 * themeTokens.includes('--color-text') // true
 * isThemeToken('--color-sepia') // false
 */

/** A theme's variables under one heading. */
export interface ThemeTokenGroup {
  /** The heading, also the comment above them in a theme's generated source. */
  label: string
  /** Each variable with what it colors. */
  tokens: Readonly<Record<string, string>>
}

/** Every variable of a theme, by group. */
export const themeTokenGroups: readonly ThemeTokenGroup[] = [
  {
    label: 'Surfaces',
    tokens: {
      '--color-background': 'The window, and fields and rows set inside a surface.',
      '--color-surface': 'Cards, panels and the sidebar.',
      '--color-surface-hover': 'A card under the pointer.',
      '--color-surface-raised': 'Buttons and controls on a surface.',
      '--color-surface-active': 'A selected entry or pressed control.',
      '--color-neutral-surface': 'Tags and badges that carry no status.'
    }
  },
  {
    label: 'Borders',
    tokens: {
      '--color-border': 'Default borders and separators.',
      '--color-border-strong': 'Borders under the pointer, and checkbox and preview outlines.'
    }
  },
  {
    label: 'Text',
    tokens: {
      '--color-text': 'Main text.',
      '--color-text-secondary': 'Text of controls and less prominent content.',
      '--color-text-muted': 'Hints, labels and secondary details.',
      '--color-text-subtle': 'The faintest text: separators, timestamps and placeholders.',
      '--color-on-accent': 'Text on a solid status or accent color.',
      '--color-on-solid': 'Marks and text on a strong color or the adult rating tag.'
    }
  },
  {
    label: 'Accent',
    tokens: {
      '--color-accent': 'Links, focus, selected states and informative text.',
      '--color-accent-surface': 'Background of informative tags and badges.'
    }
  },
  {
    label: 'Success',
    tokens: {
      '--color-success': 'Positive text and tags: watched, succeeded.',
      '--color-success-soft': 'Text on the success surface.',
      '--color-success-surface': 'Background of positive tags and buttons.',
      '--color-success-border': 'Border of positive buttons.',
      '--color-success-strong': 'Strong positive mark: an "only" filter checkbox.'
    }
  },
  {
    label: 'Warning',
    tokens: {
      '--color-warning': 'Cautionary text and tags: in progress, unknown.',
      '--color-warning-surface': 'Background of cautionary tags.'
    }
  },
  {
    label: 'Danger',
    tokens: {
      '--color-danger': 'Errors, and destructive or negative text.',
      '--color-danger-soft': 'Text on the danger surfaces.',
      '--color-danger-surface': 'Background of alerts and destructive buttons.',
      '--color-danger-surface-strong': 'Background of negative tags: not watched, unread.',
      '--color-danger-border': 'Border of alerts and destructive buttons.',
      '--color-danger-strong': 'Strong negative mark: an "exclude" filter checkbox.'
    }
  },
  {
    label: 'Special',
    tokens: {
      '--color-special': 'Planned or unstarted items.',
      '--color-special-surface': 'Background of the planned tag.'
    }
  },
  {
    label: 'Media types',
    tokens: {
      '--color-type-anime': 'The anime label of a card.',
      '--color-type-manga': 'The manga label of a card.'
    }
  },
  {
    label: 'Parental ratings',
    tokens: {
      '--color-rating-7': 'The tag of content rated 7+.',
      '--color-rating-16': 'The tag of content rated 16+.',
      '--color-rating-adult': 'The tag of adult content.'
    }
  },
  {
    label: 'Overlays',
    tokens: {
      '--color-hero-overlay-start': 'Top of the veil over a serie page background image.',
      '--color-hero-overlay-end': 'Bottom of the veil over a serie page background image.',
      '--color-shadow': 'Shadow of floating panels.'
    }
  },
  {
    label: 'Navigation',
    tokens: {
      '--color-nav-active': 'Background of the current page’s sidebar entry.',
      '--color-on-nav-active': 'Text and icon of the current page’s sidebar entry.'
    }
  },
  {
    label: 'Scrollbars',
    tokens: {
      '--color-scrollbar-thumb': 'The part of a scrollbar that moves.',
      '--color-scrollbar-track': 'The groove a scrollbar moves in.'
    }
  }
]

/** Every variable of a theme. */
export const themeTokens: readonly string[] = themeTokenGroups.flatMap((group) =>
  Object.keys(group.tokens)
)

/**
 * Tells whether a name is one of the theme's variables.
 *
 * @param name - a CSS property name.
 */
export function isThemeToken(name: string): boolean {
  return themeTokens.includes(name)
}
