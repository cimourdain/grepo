/**
 * Saves the Repos presets (`presets.json` in the configuration folder), in the order the
 * sidebar lists them.
 *
 * @example
 * store.save('Web apps', '-web$')
 * store.move('Web apps', -1)
 */
import {
  parsePreset,
  parseTagFilter,
  type PresetFilter,
  PRESET_NAME_MAX_LENGTH,
  PRESET_SIDEBAR_NAME_MAX_LENGTH,
  type RepositoryPreset
} from '../../shared/repository-presets'
import { parseViewAttributes } from '../../shared/repo-views'
import type { Outcome, PresetConfiguration } from '../../shared/ipc-contract'
import type { ConfigLocation } from '../config/config-location'
import { readJsonFile, writeJsonFile } from '../config/json-file'

/**
 * Normalizes what the page sends of its state (untrusted).
 *
 * @param filter - the page's search, filters, view and attributes.
 */
function filterFields(filter: PresetFilter): PresetFilter {
  return {
    search: String(filter?.search ?? ''),
    tagFilter: parseTagFilter(filter?.tagFilter),
    orgFilter: parseTagFilter(filter?.orgFilter),
    viewId: typeof filter?.viewId === 'string' ? filter.viewId : '',
    attributes: parseViewAttributes(filter?.attributes)
  }
}

export class PresetStore {
  /** @param location - where the configuration lives. */
  constructor(private readonly location: ConfigLocation) {}

  /** The presets, in order. */
  list(): RepositoryPreset[] {
    const raw = readJsonFile<unknown>(this.location.file('presets.json'), [])
    if (!Array.isArray(raw)) return []
    const presets: RepositoryPreset[] = []
    for (const value of raw) {
      const preset = parsePreset(value)
      if (preset && !presets.some((other) => other.name === preset.name)) presets.push(preset)
    }
    return presets
  }

  private write(presets: RepositoryPreset[]): void {
    writeJsonFile(this.location.file('presets.json'), presets)
  }

  /**
   * Replaces every preset (an import).
   *
   * @param presets - the presets, in order.
   */
  replaceAll(presets: RepositoryPreset[]): void {
    this.write(presets)
  }

  /**
   * Saves a search as a preset; an existing name keeps its place and sidebar settings.
   *
   * @param name - the preset's name.
   * @param filter - the search text and tag filter.
   */
  save(name: string, filter: PresetFilter): Outcome {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (trimmed === '') return { success: false, message: 'A preset needs a name.' }
    if (trimmed.length > PRESET_NAME_MAX_LENGTH) {
      return {
        success: false,
        message: `A preset's name has at most ${PRESET_NAME_MAX_LENGTH} characters.`
      }
    }
    const presets = this.list()
    const existing = presets.find((preset) => preset.name === trimmed)
    const fields = filterFields(filter)
    if (existing) Object.assign(existing, fields)
    else presets.push({ name: trimmed, ...fields, sidebarEnabled: true, sidebarName: '' })
    this.write(presets)
    return { success: true }
  }

  /**
   * Replaces the search and tag filter of an existing preset.
   *
   * @param name - the preset's name.
   * @param filter - the new search text and tag filter.
   */
  update(name: string, filter: PresetFilter): Outcome {
    const presets = this.list()
    const preset = presets.find((other) => other.name === name)
    if (!preset) return { success: false, message: `There is no preset “${name}”.` }
    Object.assign(preset, filterFields(filter))
    this.write(presets)
    return { success: true }
  }

  /**
   * Deletes a preset.
   *
   * @param name - the preset's name.
   */
  delete(name: string): Outcome {
    const presets = this.list()
    if (!presets.some((preset) => preset.name === name)) {
      return { success: false, message: `There is no preset “${name}”.` }
    }
    this.write(presets.filter((preset) => preset.name !== name))
    return { success: true }
  }

  /**
   * Changes a preset's sidebar line.
   *
   * @param name - the preset's name.
   * @param change - what to change.
   */
  configure(name: string, change: PresetConfiguration): Outcome {
    const presets = this.list()
    const preset = presets.find((other) => other.name === name)
    if (!preset) return { success: false, message: `There is no preset “${name}”.` }
    if (typeof change?.sidebarEnabled === 'boolean') preset.sidebarEnabled = change.sidebarEnabled
    if (typeof change?.sidebarName === 'string') {
      preset.sidebarName = change.sidebarName.trim().slice(0, PRESET_SIDEBAR_NAME_MAX_LENGTH)
    }
    this.write(presets)
    return { success: true }
  }

  /**
   * Moves a preset one place up or down.
   *
   * @param name - the preset's name.
   * @param offset - -1 for up, 1 for down.
   */
  move(name: string, offset: -1 | 1): Outcome {
    const presets = this.list()
    const index = presets.findIndex((preset) => preset.name === name)
    if (index < 0) return { success: false, message: `There is no preset “${name}”.` }
    const target = index + (offset === -1 ? -1 : 1)
    if (target < 0 || target >= presets.length) return { success: true }
    const [moved] = presets.splice(index, 1)
    presets.splice(target, 0, moved!)
    this.write(presets)
    return { success: true }
  }
}
