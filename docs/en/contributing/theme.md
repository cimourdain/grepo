# Theme

Components read every color from a CSS variable (`var(--color-surface)`), never a literal color. A theme is a full set of values for these variables, written on `:root` by one `<style id="grepo-theme">` element (`src/renderer/src/themes/apply-theme.ts`).

- `src/shared/themes/theme-tokens.ts` is the single list of variables; name a variable after its purpose, never its color.
- `src/shared/themes/included-themes.ts` holds the included themes: Light, then the Catppuccin, Gruvbox, Nord and Tokyo Night families, built from their palettes by `palette-theme.ts`.
- The selection is the `colorTheme` setting (`settings.json`). `main.ts` restores the last CSS from `localStorage` before mounting so the first frame is themed, then reads the saved setting.
- The native window paints `APP_BACKGROUND_COLOR` (`src/shared/app-theme.ts`) before the renderer loads.

To add a theme: add its key to `colorThemes` (`src/shared/app-settings.ts`), and its definition and description in `included-themes.ts`.
