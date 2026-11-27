/**
 * Views of the Repos page: named style configurations (font size, grid item minimum width) defined
 * in Settings → Repos → Views, one of them the default, and the attributes of a repository's card
 * the page can show or hide. A preset keeps the view it uses and its attributes.
 *
 * @example
 * parseRepoViews(null) // { views: [DEFAULT_VIEW], defaultId: 'default' }
 * resolveView(config, 'missing').id // the default view's id
 */

/** A view configuration. */
export interface ViewConfig {
  /** Its unique identifier. */
  id: string
  /** Its name, as the Settings and the page's view menu show it. */
  name: string
  /** The font size of the grid's cards (px). */
  fontSize: number
  /** The minimum width of a grid item (px): the grid fits as many columns as it can. */
  minItemWidth: number
}

/** The views and which is the default. */
export interface RepoViews {
  views: ViewConfig[]
  defaultId: string
}

/** The attributes of a card that can be shown or hidden. */
export const viewAttributeKeys = ['org', 'name', 'tags', 'buttons'] as const

/** One of those attributes. */
export type ViewAttributeKey = (typeof viewAttributeKeys)[number]

/** Which attributes the cards show. */
export type ViewAttributes = Record<ViewAttributeKey, boolean>

/** The labels of the attributes. */
export const viewAttributeLabels: Readonly<Record<ViewAttributeKey, string>> = {
  org: 'Org',
  name: 'Name',
  tags: 'Tags',
  buttons: 'Buttons'
}

/** The limits of a view's numbers (px). */
export const FONT_SIZE_RANGE = { min: 8, max: 32 } as const
export const MIN_ITEM_WIDTH_RANGE = { min: 160, max: 800 } as const

/** The longest view name. */
export const VIEW_NAME_MAX_LENGTH = 40

/** The view made from the Repos page's original style, used until the user defines others. */
export const DEFAULT_VIEW: Readonly<ViewConfig> = {
  id: 'default',
  name: 'Default',
  fontSize: 16,
  minItemWidth: 300
}

/** Every attribute shown. */
export function allAttributes(): ViewAttributes {
  return { org: true, name: true, tags: true, buttons: true }
}

/**
 * Normalizes attributes read from a file or sent by the page: what isn't `false` is shown.
 *
 * @param value - the value (untrusted).
 */
export function parseViewAttributes(value: unknown): ViewAttributes {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const attributes = allAttributes()
  for (const key of viewAttributeKeys) if (raw[key] === false) attributes[key] = false
  return attributes
}

/**
 * Brings a number into a range, the fallback for what isn't a number.
 *
 * @param value - the value (untrusted).
 * @param range - the limits.
 * @param fallback - what a non-number becomes.
 */
function clamp(value: unknown, range: { min: number; max: number }, fallback: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
  return Math.min(range.max, Math.max(range.min, number))
}

/**
 * Normalizes the views read from a file or sent by the page. Without any valid view, the default
 * view is the only one; a default that doesn't exist becomes the first view.
 *
 * @param value - the value (untrusted).
 */
export function parseRepoViews(value: unknown): RepoViews {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const views: ViewConfig[] = []
  if (Array.isArray(raw.views)) {
    for (const item of raw.views as Array<Record<string, unknown> | null>) {
      if (typeof item?.id !== 'string' || item.id === '' || typeof item.name !== 'string') continue
      if (views.some((view) => view.id === item.id)) continue
      views.push({
        id: item.id,
        name: item.name.trim().slice(0, VIEW_NAME_MAX_LENGTH),
        fontSize: clamp(item.fontSize, FONT_SIZE_RANGE, DEFAULT_VIEW.fontSize),
        minItemWidth: clamp(item.minItemWidth, MIN_ITEM_WIDTH_RANGE, DEFAULT_VIEW.minItemWidth)
      })
    }
  }
  if (views.length === 0) return { views: [{ ...DEFAULT_VIEW }], defaultId: DEFAULT_VIEW.id }
  const defaultId = views.some((view) => view.id === raw.defaultId)
    ? (raw.defaultId as string)
    : views[0]!.id
  return { views, defaultId }
}

/**
 * Checks views before they are saved.
 *
 * @param config - the views.
 * @returns what is wrong, empty when they are valid.
 */
export function validateRepoViews(config: RepoViews): string {
  if (config.views.length === 0) return 'Keep at least one view.'
  const names = new Set<string>()
  for (const view of config.views) {
    if (view.name.trim() === '') return 'Every view needs a name.'
    if (names.has(view.name.trim().toLowerCase())) return `Two views are named “${view.name}”.`
    names.add(view.name.trim().toLowerCase())
  }
  if (!config.views.some((view) => view.id === config.defaultId)) return 'Choose a default view.'
  return ''
}

/**
 * Finds a view, the default one when the id is unknown or empty.
 *
 * @param config - the views.
 * @param id - the view's id.
 */
export function resolveView(config: RepoViews, id: string): ViewConfig {
  return (
    config.views.find((view) => view.id === id) ??
    config.views.find((view) => view.id === config.defaultId) ??
    config.views[0] ??
    DEFAULT_VIEW
  )
}
