/**
 * Gives the repositories of an inventory their clean names and tags, from the rules of
 * Settings → Repos. It runs each time the repositories are read, not when they are inspected, so a
 * change of rules shows at once without inspecting the disk again.
 *
 * @example
 * const decorated = decorateInventory(inventory, rules, imageLoader)
 */
import {
  applyNamingRules,
  cleanTextOf,
  tagsOf,
  type NamePart,
  type RepoRules
} from '../../shared/repo-rules'
import type { RepositoryInventory } from '../../shared/repository'
import type { ImageLoader } from './image-loader'

/**
 * Decorates an inventory.
 *
 * @param inventory - what an inspection found.
 * @param rules - the naming and tag rules.
 * @param images - what reads the images of the naming rules.
 * @returns a new inventory.
 */
export function decorateInventory(
  inventory: RepositoryInventory,
  rules: RepoRules,
  images: Pick<ImageLoader, 'load'>
): RepositoryInventory {
  return {
    ...inventory,
    repositories: inventory.repositories.map((repository) => {
      const cleanParts: NamePart[] = applyNamingRules(repository.folderName, rules.namingRules).map(
        (part) => (part.type === 'image' ? { ...part, src: images.load(part.path) } : part)
      )
      return {
        ...repository,
        cleanParts,
        cleanName: cleanTextOf(cleanParts),
        tags: tagsOf(repository, rules.tagRules)
      }
    })
  }
}
