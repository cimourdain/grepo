/**
 * The rules of Settings → Repos, and the pure functions applying them:
 *
 * - **Naming rules** build a repository's clean name. Each rule is a regular expression
 *   (case-insensitive) searched in the folder name and replaced by a text (`$1`… are the
 *   expression's groups) or by an image. Rules apply in order, each on the result of the previous
 *   one; then dashes and underscores separate the words, each starting with a capital letter.
 * - **Tag rules** give tags: a rule whose expression matches its target (the repository's name,
 *   `org/name`, org or local path) gives all of its tags.
 *
 * @example
 * applyNamingRules('shop-checkout-payment-pay-landingpage', [
 *   { search: 'checkout-payment', type: 'text', value: 'Pay' }
 * ]) // [{ type: 'text', text: 'Shop Pay Pay Landingpage' }]
 * tagsOf(repository, [{ search: '-web$', tags: ['frontend'], target: 'name' }]) // ['frontend']
 */
import { isHexColor } from './tag-colors'
import type { Repository } from './repository'

/** A naming rule. */
export interface NamingRule {
  /** The regular expression searched in the name. */
  search: string
  /** What replaces a match: a text, or an image (`value` is then the image file's path). */
  type: 'text' | 'image'
  value: string
}

/** What a tag rule's query can be tested on. */
export const tagRuleTargets = ['name', 'org-name', 'org', 'path'] as const

/** One of those targets. */
export type TagRuleTarget = (typeof tagRuleTargets)[number]

/** The labels of the targets, as the selector shows them. */
export const tagRuleTargetLabels: Readonly<Record<TagRuleTarget, string>> = {
  name: 'Repo name',
  'org-name': 'Org / repo name',
  org: 'Org',
  path: 'Local path'
}

/** A tag rule. */
export interface TagRule {
  /** The regular expression tested on the repository's name. */
  search: string
  /** The tags a match gives. */
  tags: string[]
  /** What the query is tested on. */
  target: TagRuleTarget
}

/** Both kinds of rules. */
export interface RepoRules {
  namingRules: NamingRule[]
  tagRules: TagRule[]
  /** The colors (`#RRGGBB`) chosen for tags, by tag; the others get an automatic color. */
  tagColors: Record<string, string>
}

/** A piece of a clean name. */
export type NamePart =
  | { type: 'text'; text: string }
  /** `src` is the image as a data URL, `null` when the file can't be read. */
  | { type: 'image'; path: string; src: string | null }

/** The rules of a first start: none. */
export const NO_RULES: Readonly<RepoRules> = { namingRules: [], tagRules: [], tagColors: {} }

/** The longest a rule's search or value is. */
const MAX_FIELD_LENGTH = 300

/** Marks an image in the text the rules work on (Unicode private use characters). */
const IMAGE_START = ''
const IMAGE_END = ''
const IMAGE_TOKEN = new RegExp(`^${IMAGE_START}(\\d+)${IMAGE_END}$`)

/**
 * Compiles a rule's search.
 *
 * @param search - the regular expression.
 * @returns the expression, `null` when it is empty or invalid.
 */
function compile(search: string): RegExp | null {
  if (search.trim() === '') return null
  try {
    return new RegExp(search, 'i')
  } catch {
    return null
  }
}

/**
 * Reads a tag rule's target. A rule saved with the former `includeOrg` checkbox keeps its meaning:
 * checked is `org-name`.
 *
 * @param rule - the rule (untrusted).
 */
function parseTarget(rule: Record<string, unknown>): TagRuleTarget {
  if ((tagRuleTargets as readonly unknown[]).includes(rule.target)) {
    return rule.target as TagRuleTarget
  }
  return rule.includeOrg === true ? 'org-name' : 'name'
}

/**
 * Normalizes the naming rules of a file or of the page.
 *
 * @param value - the value (untrusted).
 */
function parseNamingRules(value: unknown): NamingRule[] {
  if (!Array.isArray(value)) return []
  const rules: NamingRule[] = []
  for (const raw of value as Array<Record<string, unknown> | null>) {
    if (typeof raw?.search !== 'string' || typeof raw.value !== 'string') continue
    rules.push({
      search: raw.search.slice(0, MAX_FIELD_LENGTH),
      type: raw.type === 'image' ? 'image' : 'text',
      value: raw.value.slice(0, MAX_FIELD_LENGTH)
    })
  }
  return rules
}

/**
 * Cleans a list of tags: trimmed, no empty one, no duplicate.
 *
 * @param tags - the tags (untrusted).
 */
export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  for (const tag of tags) {
    if (typeof tag === 'string' && tag.trim() !== '') seen.add(tag.trim().slice(0, 40))
  }
  return [...seen]
}

/**
 * Splits the text a user typed into tags: separated by commas.
 *
 * @param text - for example `frontend, web`.
 */
export function splitTags(text: string): string[] {
  return normalizeTags(text.split(','))
}

/**
 * Normalizes rules read from a file or sent by the page.
 *
 * @param value - the value (untrusted).
 */
export function parseRepoRules(value: unknown): RepoRules {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const tagRules: TagRule[] = []
  if (Array.isArray(raw.tagRules)) {
    for (const rule of raw.tagRules as Array<Record<string, unknown> | null>) {
      if (typeof rule?.search !== 'string') continue
      tagRules.push({
        search: rule.search.slice(0, MAX_FIELD_LENGTH),
        tags: normalizeTags(rule.tags),
        target: parseTarget(rule)
      })
    }
  }
  const tagColors: Record<string, string> = {}
  if (typeof raw.tagColors === 'object' && raw.tagColors !== null) {
    for (const [tag, color] of Object.entries(raw.tagColors)) {
      if (isHexColor(color)) tagColors[tag] = color.toUpperCase()
    }
  }
  return { namingRules: parseNamingRules(raw.namingRules), tagRules, tagColors }
}

/**
 * Checks the rules before they are saved.
 *
 * @param rules - the rules.
 * @returns what is wrong with the first faulty rule, empty when they are valid.
 */
export function validateRepoRules(rules: RepoRules): string {
  const groups: Array<[string, Array<{ search: string }>]> = [
    ['Naming rule', rules.namingRules],
    ['Tag rule', rules.tagRules]
  ]
  for (const [label, list] of groups) {
    for (const [index, rule] of list.entries()) {
      if (rule.search.trim() === '') return `${label} ${index + 1}: the search query is empty.`
      try {
        new RegExp(rule.search, 'i')
      } catch (error) {
        return `${label} ${index + 1}: ${error instanceof Error ? error.message : 'invalid regular expression'}`
      }
    }
  }
  for (const [index, rule] of rules.namingRules.entries()) {
    if (rule.type === 'image' && rule.value.trim() === '') {
      return `Naming rule ${index + 1}: choose an image.`
    }
  }
  for (const [index, rule] of rules.tagRules.entries()) {
    if (rule.tags.length === 0) return `Tag rule ${index + 1}: give at least one tag.`
  }
  return ''
}

/**
 * Builds a clean name from a folder name: applies the naming rules in order, then separates the
 * words at dashes, underscores and spaces and capitalizes each. An invalid rule is skipped.
 *
 * @param folderName - the repository's folder name.
 * @param rules - the naming rules, always applied to the name, never to the org.
 * @returns the pieces: texts and images in order; images have no `src` yet.
 */
export function applyNamingRules(folderName: string, rules: readonly NamingRule[]): NamePart[] {
  const images: string[] = []
  let name = folderName
  for (const rule of rules) {
    const pattern = compile(rule.search)
    if (!pattern) continue
    if (rule.type === 'image') {
      if (!pattern.test(name)) continue
      // Spaces around the marker keep the image apart from its neighbours' words.
      const marker = ` ${IMAGE_START}${images.length}${IMAGE_END} `
      images.push(rule.value)
      name = name.replace(pattern, () => marker)
    } else {
      name = name.replace(pattern, rule.value)
    }
  }

  const parts: NamePart[] = []
  let words: string[] = []
  const flush = (): void => {
    if (words.length > 0) parts.push({ type: 'text', text: words.join(' ') })
    words = []
  }
  for (const word of name.split(/[-_\s]+/)) {
    if (word === '') continue
    const image = IMAGE_TOKEN.exec(word)
    if (image) {
      flush()
      parts.push({ type: 'image', path: images[Number(image[1])]!, src: null })
    } else {
      words.push(word.charAt(0).toUpperCase() + word.slice(1))
    }
  }
  flush()
  return parts
}

/**
 * Writes a clean name as plain text: its texts, the images left out.
 *
 * @param parts - the pieces.
 */
export function cleanTextOf(parts: readonly NamePart[]): string {
  return parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join(' ')
}

/**
 * Gives the text a tag rule is tested on.
 *
 * @param repository - the repository.
 * @param target - the rule's target.
 */
export function tagTargetOf(
  repository: Pick<Repository, 'folderName' | 'realName' | 'path' | 'github'>,
  target: TagRuleTarget
): string {
  switch (target) {
    case 'org-name':
      return repository.realName
    case 'org':
      return repository.github?.org ?? ''
    case 'path':
      return repository.path
    default:
      return repository.folderName
  }
}

/**
 * Gives the tags of a repository: those of every rule whose query matches the rule's target: the
 * repository's name (its folder name), `org/name`, its org or its local path. A repository without
 * a GitHub remote has no org: `org/name` is then its name alone, and `org` is empty.
 *
 * @param repository - the repository.
 * @param rules - the tag rules.
 * @returns the tags, without duplicates, in the order of the rules.
 */
export function tagsOf(
  repository: Pick<Repository, 'folderName' | 'realName' | 'path' | 'github'>,
  rules: readonly TagRule[]
): string[] {
  const tags = new Set<string>()
  for (const rule of rules) {
    const pattern = compile(rule.search)
    if (pattern && pattern.test(tagTargetOf(repository, rule.target))) {
      for (const tag of rule.tags) tags.add(tag)
    }
  }
  return [...tags]
}
