/**
 * Exports the settings to a file and imports them from one (Settings → Import/Export): reads the
 * current settings from the stores, and writes an imported file into them. What chooses the file
 * (the system's dialogs) and what reads and writes it is injected, so the logic is tested without a
 * desktop.
 *
 * @example
 * const exchange = new SettingsExchange(stores)
 * const file = exchange.export(new Date())
 * exchange.apply(parsed.data)
 */
import {
  buildExportFile,
  isLocalPathRule,
  type ExchangeData,
  type ExportFile
} from '../../shared/settings-exchange'
import type { SettingsStore } from '../config/settings-store'
import type { PresetStore } from '../presets/preset-store'
import type { RulesStore } from '../repositories/rules-store'
import type { ViewsStore } from '../repositories/views-store'

/** The stores holding what is exchanged. */
export interface ExchangeStores {
  settings: SettingsStore
  rules: RulesStore
  views: ViewsStore
  presets: PresetStore
}

export class SettingsExchange {
  /** @param stores - the stores holding the settings. */
  constructor(private readonly stores: ExchangeStores) {}

  /** The settings as they are now. */
  current(): ExchangeData {
    return {
      includesLocalPaths: true,
      localReposPaths: this.stores.settings.read().localReposPaths,
      rules: this.stores.rules.read(),
      view: { views: this.stores.views.read(), presets: this.stores.presets.list() }
    }
  }

  /**
   * Builds the export file's content.
   *
   * @param now - the current time.
   * @param includeLocalPaths - whether the file holds the local-path based settings (the local
   * repositories paths and the tag rules on the local path).
   */
  export(now: Date, includeLocalPaths = true): ExportFile {
    return buildExportFile(this.current(), now, includeLocalPaths)
  }

  /**
   * Replaces the settings with an imported file's (already checked by `parseExportFile`). A file
   * without the local-path based settings keeps this computer's: its local repositories paths and
   * its tag rules on the local path, which stay after the imported tag rules.
   *
   * @param data - the checked data.
   * @throws when a store refuses a part.
   */
  apply(data: ExchangeData): void {
    const current = this.stores.rules.read()
    const imported = data.includesLocalPaths
      ? data.rules
      : {
          ...data.rules,
          tagRules: [...data.rules.tagRules, ...current.tagRules.filter(isLocalPathRule)]
        }
    const rules = this.stores.rules.write(imported)
    if (!rules.success) throw new Error(rules.message)
    const views = this.stores.views.write(data.view.views)
    if (!views.success) throw new Error(views.message)
    this.stores.presets.replaceAll(data.view.presets)
    if (data.includesLocalPaths)
      this.stores.settings.write({ localReposPaths: data.localReposPaths })
  }
}
