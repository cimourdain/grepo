/**
 * Applies the selected theme to the app: one `<style>` element holding its variables on `:root`,
 * which every component's styles read. The last CSS applied is kept in the window's storage, to
 * paint the first frame in the right theme before the main process has answered.
 *
 * @example
 * restoreLastTheme() // at startup, before mounting
 * await applySavedTheme() // once the app runs
 * applyTheme('nord-frost') // after the user picks one
 */
import { DEFAULT_COLOR_THEME, type ColorTheme } from '../../../shared/app-settings'
import type { IpcApi } from '../../../shared/ipc-contract'
import { includedThemes } from '../../../shared/themes/included-themes'
import { themeVariablesCss } from '../../../shared/themes/theme-css'

/** The id of the `<style>` element holding the theme. */
const THEME_STYLE_ELEMENT_ID = 'grepo-theme'

/** The storage key of the last CSS applied. */
const LAST_THEME_STORAGE_KEY = 'grepo-theme-css'

/**
 * Sets the CSS of the theme, and keeps it for the next start.
 *
 * @param css - the theme's CSS.
 */
function setThemeCss(css: string): void {
  let element = document.getElementById(THEME_STYLE_ELEMENT_ID)
  if (!element) {
    element = document.createElement('style')
    element.id = THEME_STYLE_ELEMENT_ID
    document.head.appendChild(element)
  }
  element.textContent = css
  try {
    localStorage.setItem(LAST_THEME_STORAGE_KEY, css)
  } catch {
    // Only the first frame of the next start depends on it.
  }
}

/**
 * Applies an included theme.
 *
 * @param theme - the theme.
 */
export function applyTheme(theme: ColorTheme): void {
  setThemeCss(themeVariablesCss(includedThemes[theme]))
}

/** Applies the last theme applied, or the default one on a first start. */
export function restoreLastTheme(): void {
  let css: string | null
  try {
    css = localStorage.getItem(LAST_THEME_STORAGE_KEY)
  } catch {
    css = null
  }
  setThemeCss(css ?? themeVariablesCss(includedThemes[DEFAULT_COLOR_THEME]))
}

/** Reads the saved theme and applies it; the one showing stays when it can't be read. */
export async function applySavedTheme(): Promise<void> {
  const api = (window as { api?: IpcApi }).api
  if (!api) return
  try {
    applyTheme((await api.getSettings()).colorTheme)
  } catch {
    // The theme showing stays.
  }
}
