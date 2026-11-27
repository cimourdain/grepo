/**
 * The settings file of Settings → Import/Export: what an export contains, and the checks an import
 * does before anything is changed.
 *
 * The file is JSON:
 *
 * ```json
 * {
 *   "app": "grepo", "format": 1, "exportedAt": "…",
 *   "includesLocalPaths": true,
 *   "localReposPaths": ["/home/me/code"],
 *   "rules": { "namingRules": [], "tagRules": [], "tagColors": {} },
 *   "view": { "views": { "views": [], "defaultId": "default" }, "presets": [] }
 * }
 * ```
 *
 * It holds the local repositories paths, the rules (naming and tags, with the tag colors) and the
 * settings of the View tab (the view styling configurations and the presets). It holds no secret:
 * the GitHub token is never exported.
 *
 * The settings that depend on this computer's local paths (the local repositories paths, and the
 * tag rules tested on the local path) can be left out of an export (`includesLocalPaths: false`),
 * to share the rest with another computer. Importing such a file keeps this computer's own.
 *
 * @example
 * const file = buildExportFile(state, new Date())
 * const parsed = parseExportFile(JSON.parse(text)) // { success: true, data } | { success: false, message }
 */
import { expandPath, isAbsolutePath } from './app-settings'
import { parseRepoRules, validateRepoRules, type RepoRules, type TagRule } from './repo-rules'
import { parsePreset, type RepositoryPreset } from './repository-presets'
import { parseRepoViews, validateRepoViews, type RepoViews } from './repo-views'

/** The format's name in the file, and its version. */
export const EXPORT_APP = 'grepo'
export const EXPORT_FORMAT = 1

/** What is exported and imported. */
export interface ExchangeData {
  /**
   * Whether the data holds what depends on this computer's local paths: the local repositories
   * paths and the tag rules on the local path. An export can leave them out (`false`); an import
   * of such a file then keeps the current ones.
   */
  includesLocalPaths: boolean
  /** Empty when `includesLocalPaths` is `false`. */
  localReposPaths: string[]
  rules: RepoRules
  view: {
    views: RepoViews
    presets: RepositoryPreset[]
  }
}

/** The file's content. */
export interface ExportFile extends ExchangeData {
  app: typeof EXPORT_APP
  format: typeof EXPORT_FORMAT
  /** When it was exported (ISO 8601). */
  exportedAt: string
}

/** How many things a file holds, for the page to show before an import. */
export interface ExchangeSummary {
  /** Whether the file holds the local-path based settings. */
  includesLocalPaths: boolean
  localReposPaths: number
  namingRules: number
  tagRules: number
  views: number
  presets: number
}

/** The result of reading an import file. */
export type ParsedExport =
  { success: true; data: ExchangeData } | { success: false; message: string }

/**
 * Names the export file: `grepo-settings-<date>-<time>.json`, with the local date and time of the
 * export (`YYYYMMDD-HHmmss`), so successive exports don't overwrite each other and sort in order.
 *
 * @param now - the time of the export.
 * @example
 * exportFileName(new Date(2026, 0, 31, 9, 5, 7)) // 'grepo-settings-20260131-090507.json'
 */
export function exportFileName(now: Date): string {
  const two = (value: number): string => String(value).padStart(2, '0')
  const date = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}`
  const time = `${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`
  return `grepo-settings-${date}-${time}.json`
}

/**
 * Tells whether a tag rule depends on this computer's local paths.
 *
 * @param rule - the tag rule.
 */
export function isLocalPathRule(rule: TagRule): boolean {
  return rule.target === 'path'
}

/**
 * Takes the settings that depend on this computer's local paths out of some data: the local
 * repositories paths and the tag rules tested on the local path.
 *
 * @param data - the settings.
 * @returns a copy without them, marked as not including them.
 */
export function withoutLocalPaths(data: ExchangeData): ExchangeData {
  return {
    ...data,
    includesLocalPaths: false,
    localReposPaths: [],
    rules: { ...data.rules, tagRules: data.rules.tagRules.filter((rule) => !isLocalPathRule(rule)) }
  }
}

/**
 * Builds the content of an export file.
 *
 * @param data - the current settings.
 * @param now - the current time.
 * @param includeLocalPaths - whether the file holds the local-path based settings (the local
 * repositories paths and the tag rules on the local path); `true` by default.
 */
export function buildExportFile(
  data: ExchangeData,
  now: Date,
  includeLocalPaths = true
): ExportFile {
  const exported = includeLocalPaths
    ? { ...data, includesLocalPaths: true }
    : withoutLocalPaths(data)
  return { app: EXPORT_APP, format: EXPORT_FORMAT, exportedAt: now.toISOString(), ...exported }
}

/**
 * Counts what a file holds.
 *
 * @param data - the file's data.
 */
export function summarize(data: ExchangeData): ExchangeSummary {
  return {
    includesLocalPaths: data.includesLocalPaths,
    localReposPaths: data.localReposPaths.length,
    namingRules: data.rules.namingRules.length,
    tagRules: data.rules.tagRules.length,
    views: data.view.views.views.length,
    presets: data.view.presets.length
  }
}

/**
 * Reads and checks an import file's content. Nothing is accepted half-way: one invalid part
 * refuses the whole file, with the reason.
 *
 * @param value - the parsed JSON (untrusted).
 * @param home - the user's home folder, for `~` and `${HOME}` in the paths.
 */
export function parseExportFile(value: unknown, home = '/home'): ParsedExport {
  const fail = (message: string): ParsedExport => ({ success: false, message })
  if (typeof value !== 'object' || value === null) return fail('This is not a Grepo settings file.')
  const raw = value as Record<string, unknown>
  if (raw.app !== EXPORT_APP) return fail('This is not a Grepo settings file.')
  if (raw.format !== EXPORT_FORMAT) {
    return fail(`This settings file’s format (${String(raw.format)}) is not supported.`)
  }

  // A file made without the local-path based settings says so; older files hold them.
  const includesLocalPaths = raw.includesLocalPaths !== false
  let paths: string[] = []
  if (includesLocalPaths) {
    if (!Array.isArray(raw.localReposPaths))
      return fail('The local repositories paths are missing.')
    paths = [
      ...new Set(
        raw.localReposPaths
          .filter((path): path is string => typeof path === 'string')
          .map((path) => path.trim())
          .filter((path) => path !== '')
      )
    ]
    if (paths.length === 0) return fail('The file holds no local repositories path.')
    const relative = paths.find((path) => !isAbsolutePath(expandPath(path, home)))
    if (relative) return fail(`“${relative}” is not an absolute path.`)
  }

  if (typeof raw.rules !== 'object' || raw.rules === null) return fail('The rules are missing.')
  let rules = parseRepoRules(raw.rules)
  // Whatever such a file holds of the local-path based rules is left out, as it says.
  if (!includesLocalPaths) {
    rules = { ...rules, tagRules: rules.tagRules.filter((rule) => !isLocalPathRule(rule)) }
  }
  const rulesProblem = validateRepoRules(rules)
  if (rulesProblem !== '') return fail(`The rules are invalid: ${rulesProblem}`)

  const view = raw.view as Record<string, unknown> | null | undefined
  if (typeof view !== 'object' || view === null) return fail('The View settings are missing.')
  const views = parseRepoViews(view.views)
  const viewsProblem = validateRepoViews(views)
  if (viewsProblem !== '') return fail(`The views are invalid: ${viewsProblem}`)
  const presets: RepositoryPreset[] = []
  if (Array.isArray(view.presets)) {
    for (const item of view.presets) {
      const preset = parsePreset(item)
      if (preset && !presets.some((other) => other.name === preset.name)) presets.push(preset)
    }
  }

  return {
    success: true,
    data: { includesLocalPaths, localReposPaths: paths, rules, view: { views, presets } }
  }
}
