/**
 * What the Repos page itself (not a preset's page) shows: its search, filters, view and shown
 * attributes. It is kept here, outside the page component, so it survives a visit to a preset's
 * page (which reuses the same component and loads the preset's own state) and to other pages:
 * coming back to Repos shows what was there before, and visiting a preset never changes it.
 * It lives as long as the window; only presets are saved on disk.
 *
 * @example
 * saveMainPageState({ search: 'shop', tagFilter: {}, orgFilter: {}, viewId: '', attributes })
 * loadMainPageState()?.search // 'shop'
 */
import type { TagFilter } from '../../../shared/repository-presets'
import type { ViewAttributes } from '../../../shared/repo-views'

/** The state of the page. */
export interface PageState {
  search: string
  tagFilter: TagFilter
  orgFilter: TagFilter
  /** The id of the view in use; empty: the default view. */
  viewId: string
  attributes: ViewAttributes
}

let saved: PageState | null = null

/**
 * Remembers the Repos page's state (a copy).
 *
 * @param state - the state.
 */
export function saveMainPageState(state: PageState): void {
  saved = JSON.parse(JSON.stringify(state)) as PageState
}

/** The remembered state (a copy), `null` when the page was never changed. */
export function loadMainPageState(): PageState | null {
  return saved === null ? null : (JSON.parse(JSON.stringify(saved)) as PageState)
}

/** Forgets the remembered state (tests). */
export function clearMainPageState(): void {
  saved = null
}
