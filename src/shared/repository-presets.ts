/**
 * Repos presets: a saved state of the Repos page (search text, org and tag filters, view, shown attributes), optionally listed in the sidebar under
 * Repos. Pure helpers, shared by the main process (which saves them) and the page.
 *
 * @example
 * presetRoute('Web apps') // '/repos/preset/Web%20apps'
 */
import { parseViewAttributes, type ViewAttributes } from './repo-views'

/** The longest preset name. */
export const PRESET_NAME_MAX_LENGTH = 60

/** The longest sidebar name. */
export const PRESET_SIDEBAR_NAME_MAX_LENGTH = 30

/** The tags a preset keeps: each `only` (shown) or `exclude` (hidden), as the Filter popover sets them. */
export type TagFilter = Record<string, 'only' | 'exclude'>

/** What a preset saves of the Repos page: its search text and its tag filter. */
export interface PresetFilter {
  search: string
  tagFilter: TagFilter
  /** The orgs it shows or hides. */
  orgFilter: TagFilter
  /** The id of the view configuration it uses (Settings → Repos → Views); the default view when unknown. */
  viewId: string
  /** The attributes of the cards it shows. */
  attributes: ViewAttributes
}

/**
 * Normalizes a tag filter read from a file or sent by the page.
 *
 * @param value - the value (untrusted).
 */
export function parseTagFilter(value: unknown): TagFilter {
  const filter: TagFilter = {}
  if (typeof value !== 'object' || value === null) return filter
  for (const [tag, state] of Object.entries(value)) {
    if (state === 'only' || state === 'exclude') filter[tag] = state
  }
  return filter
}

/** A saved search. */
export interface RepositoryPreset {
  /** Its unique name. */
  name: string
  /** The search text (a regular expression) the Repos page filters on. */
  search: string
  /** The tags it shows or hides. */
  tagFilter: TagFilter
  /** The orgs it shows or hides. */
  orgFilter: TagFilter
  /** The id of the view configuration it uses; the default view when unknown. */
  viewId: string
  /** The attributes of the cards it shows. */
  attributes: ViewAttributes
  /** Whether the sidebar lists it under Repos. */
  sidebarEnabled: boolean
  /** The name the sidebar shows; empty: the preset's own name. */
  sidebarName: string
}

/**
 * Normalizes a preset read from a file or sent by the page.
 *
 * @param value - the value (untrusted).
 * @returns the preset, `null` when it can't be one.
 */
export function parsePreset(value: unknown): RepositoryPreset | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.name !== 'string' || typeof raw.search !== 'string') return null
  const name = raw.name.trim().slice(0, PRESET_NAME_MAX_LENGTH)
  if (name === '') return null
  return {
    name,
    search: raw.search,
    tagFilter: parseTagFilter(raw.tagFilter),
    orgFilter: parseTagFilter(raw.orgFilter),
    viewId: typeof raw.viewId === 'string' ? raw.viewId : '',
    attributes: parseViewAttributes(raw.attributes),
    sidebarEnabled: raw.sidebarEnabled !== false,
    sidebarName:
      typeof raw.sidebarName === 'string'
        ? raw.sidebarName.trim().slice(0, PRESET_SIDEBAR_NAME_MAX_LENGTH)
        : ''
  }
}

/**
 * Gives the label the sidebar shows for a preset.
 *
 * @param preset - the preset.
 */
export function presetSidebarLabel(preset: RepositoryPreset): string {
  return preset.sidebarName === '' ? preset.name : preset.sidebarName
}

/**
 * Gives the address of the Repos page opened on a preset.
 *
 * @param name - the preset's name.
 */
export function presetRoute(name: string): string {
  return `/repos/preset/${encodeURIComponent(name)}`
}
