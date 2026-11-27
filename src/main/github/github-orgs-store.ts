/**
 * Saves the last inspection of the GitHub account and what the user enabled in it
 * (`github-orgs.json` in the configuration folder). Logging out clears it.
 */
import {
  parseSelection,
  type GithubInspection,
  type GithubOrgsView,
  type GithubSelection
} from '../../shared/github-orgs'
import type { ConfigLocation } from '../config/config-location'
import { readJsonFile, writeJsonFile } from '../config/json-file'

export class GithubOrgsStore {
  /** @param location - where the configuration lives. */
  constructor(private readonly location: ConfigLocation) {}

  /** The saved inspection and selection. */
  read(): GithubOrgsView {
    const raw = readJsonFile<Record<string, unknown>>(this.location.file('github-orgs.json'), {})
    const inspection = raw.inspection as Partial<GithubInspection> | null | undefined
    return {
      inspection:
        inspection && Array.isArray(inspection.orgs)
          ? {
              orgs: inspection.orgs,
              inspectedAt: String(inspection.inspectedAt ?? ''),
              ssoRequired: Array.isArray(inspection.ssoRequired) ? inspection.ssoRequired : []
            }
          : null,
      selection: parseSelection(raw.selection)
    }
  }

  private write(view: GithubOrgsView): void {
    writeJsonFile(this.location.file('github-orgs.json'), view)
  }

  /**
   * Saves a new inspection, keeping the selection.
   *
   * @param inspection - what was found.
   */
  saveInspection(inspection: GithubInspection): GithubOrgsView {
    const view = { ...this.read(), inspection }
    this.write(view)
    return view
  }

  /**
   * Saves the selection.
   *
   * @param selection - what the user turned off (untrusted).
   */
  saveSelection(selection: unknown): void {
    this.write({ ...this.read(), selection: parseSelection(selection) })
  }

  /** Forgets everything. */
  clear(): void {
    this.write({ inspection: null, selection: parseSelection(null) })
  }
}

export type { GithubSelection }
