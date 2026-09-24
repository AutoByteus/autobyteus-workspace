export interface MatchableSelectItem {
  id: string
  aliasIds?: readonly string[]
}

/** Whether `value` selects `item`: its own id or one of the other values it represents. */
export const selectItemMatches = (
  item: MatchableSelectItem,
  value: string | null | undefined,
): boolean => Boolean(value) && (item.id === value || (item.aliasIds?.includes(value!) ?? false))
