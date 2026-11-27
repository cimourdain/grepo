/**
 * Tri-state filter facet logic, shared by every selectable-items facet of the
 * Library page's Filter popover (Tags, Connector, Watch Status, Serie Status…).
 *
 * Each value of a facet is either un-set (absent from the facet state),
 * `'only'` (included), or `'exclude'` (excluded):
 * - nothing set: the facet filters nothing;
 * - values included only: a serie passes when it matches at least one of them;
 * - values excluded only: a serie passes unless it matches one of them;
 * - both: a serie passes when it matches at least one included value and no
 *   excluded one.
 *
 * @example
 * const tagFilterState: TriStateFacetState = { Action: 'only', Historical: 'only', Drama: 'exclude' }
 * // Series tagged Action or Historical, unless they are tagged Drama too.
 * passesTriStateFacet(tagFilterState, (tag) => serie.tags.includes(tag))
 */

/** Explicit state of one facet value; un-set values are absent from the state. */
export type TriStateValue = 'only' | 'exclude'

/** A facet's selections, keyed by facet value (absent key = un-set). */
export type TriStateFacetState = Record<string, TriStateValue>

/**
 * Next state in the click cycle: un-set → only → exclude → un-set.
 *
 * @param currentValue - The value's current state (`undefined` = un-set).
 * @returns The state the value takes after one click.
 */
export function nextTriStateValue(
  currentValue: TriStateValue | undefined
): TriStateValue | undefined {
  if (currentValue === undefined) return 'only'
  if (currentValue === 'only') return 'exclude'
  return undefined
}

/**
 * Return a copy of a facet state with one value's state replaced
 * (removing the key when the new state is un-set).
 *
 * @param facetState - The current facet state (not mutated).
 * @param facetValue - The facet value to update (e.g. a tag name).
 * @param newValue - Its new state (`undefined` = un-set).
 * @returns The updated facet state.
 *
 * @example
 * withTriStateValue({ Action: 'only' }, 'Action', undefined) // {}
 */
export function withTriStateValue(
  facetState: TriStateFacetState,
  facetValue: string,
  newValue: TriStateValue | undefined
): TriStateFacetState {
  const updatedState = { ...facetState }
  if (newValue === undefined) {
    delete updatedState[facetValue]
  } else {
    updatedState[facetValue] = newValue
  }
  return updatedState
}

/**
 * Whether a serie passes a tri-state facet: it matches at least one `'only'`
 * value, if there is any, and no `'exclude'` value (see the file header).
 *
 * @param facetState - The facet's selections.
 * @param serieMatchesValue - Whether the serie being tested matches a
 *   given facet value (e.g. `(tag) => serie.tags.includes(tag)`).
 * @returns `true` if the serie passes this facet.
 */
export function passesTriStateFacet(
  facetState: TriStateFacetState,
  serieMatchesValue: (facetValue: string) => boolean
): boolean {
  const facetEntries = Object.entries(facetState)
  const onlyValues = facetEntries.filter(([, state]) => state === 'only').map(([value]) => value)
  const excludeValues = facetEntries
    .filter(([, state]) => state === 'exclude')
    .map(([value]) => value)

  return (
    (onlyValues.length === 0 || onlyValues.some(serieMatchesValue)) &&
    !excludeValues.some(serieMatchesValue)
  )
}
