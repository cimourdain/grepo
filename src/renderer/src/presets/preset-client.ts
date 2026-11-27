/**
 * The Repos presets shared by the sidebar, the Repos page and Settings: one reactive list, read
 * from the main process, which every change reloads so they all follow.
 *
 * @example
 * await loadPresets()
 * sidebarPresets.value // the presets the sidebar lists
 */
import { computed, ref } from 'vue'

import type { IpcApi } from '../../../shared/ipc-contract'
import type { RepositoryPreset } from '../../../shared/repository-presets'

/** Every preset, in order. */
export const presets = ref<RepositoryPreset[]>([])

/** The presets the sidebar lists. */
export const sidebarPresets = computed(() =>
  presets.value.filter((preset) => preset.sidebarEnabled)
)

/** Reads the presets again. */
export async function loadPresets(): Promise<void> {
  const api = (window as { api?: IpcApi }).api
  if (!api) return
  try {
    presets.value = await api.listPresets()
  } catch {
    // The list showing stays.
  }
}
