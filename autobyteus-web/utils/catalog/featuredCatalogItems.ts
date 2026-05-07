export const FEATURED_CATALOG_ITEMS_SETTING_KEY = 'AUTOBYTEUS_FEATURED_CATALOG_ITEMS'

export const FEATURED_CATALOG_RESOURCE_KINDS = ['AGENT', 'AGENT_TEAM'] as const

export type FeaturedCatalogResourceKind = (typeof FEATURED_CATALOG_RESOURCE_KINDS)[number]

export interface FeaturedCatalogItem {
  resourceKind: FeaturedCatalogResourceKind
  definitionId: string
  sortOrder: number
}

export interface FeaturedCatalogItemsSetting {
  version: 1
  items: FeaturedCatalogItem[]
}

export interface FeaturedCatalogDefinition {
  id: string
}

export type FeaturedCatalogItemsParseResult =
  | { ok: true; setting: FeaturedCatalogItemsSetting }
  | { ok: false; error: string; setting: FeaturedCatalogItemsSetting }

const emptySetting = (): FeaturedCatalogItemsSetting => ({
  version: 1,
  items: [],
})

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const isResourceKind = (value: unknown): value is FeaturedCatalogResourceKind => (
  value === 'AGENT' || value === 'AGENT_TEAM'
)

const normalizeSortOrder = (value: unknown, index: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return (index + 1) * 10
}

const identityKey = (item: Pick<FeaturedCatalogItem, 'resourceKind' | 'definitionId'>): string => (
  `${item.resourceKind}:${item.definitionId}`
)

export const sortFeaturedCatalogItems = (items: FeaturedCatalogItem[]): FeaturedCatalogItem[] => (
  items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      if (left.item.sortOrder !== right.item.sortOrder) {
        return left.item.sortOrder - right.item.sortOrder
      }
      return left.index - right.index
    })
    .map(({ item }) => item)
)

export const normalizeFeaturedCatalogItems = (items: FeaturedCatalogItem[]): FeaturedCatalogItem[] => (
  sortFeaturedCatalogItems(items.map((item, index) => ({
    resourceKind: item.resourceKind,
    definitionId: item.definitionId.trim(),
    sortOrder: normalizeSortOrder(item.sortOrder, index),
  })))
)

export const parseFeaturedCatalogItemsSetting = (
  rawValue: string | null | undefined,
): FeaturedCatalogItemsParseResult => {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return { ok: true, setting: emptySetting() }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch (error) {
    return {
      ok: false,
      error: `Featured catalog setting JSON is invalid: ${String(error)}`,
      setting: emptySetting(),
    }
  }

  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.items)) {
    return {
      ok: false,
      error: 'Featured catalog setting must be a version 1 object with an items array.',
      setting: emptySetting(),
    }
  }

  const seenIdentities = new Set<string>()
  const items: FeaturedCatalogItem[] = []

  for (const [index, rawItem] of parsed.items.entries()) {
    if (!isRecord(rawItem) || !isResourceKind(rawItem.resourceKind)) {
      return {
        ok: false,
        error: `Featured catalog item ${index + 1} has an invalid resource kind.`,
        setting: emptySetting(),
      }
    }

    if (typeof rawItem.definitionId !== 'string' || rawItem.definitionId.trim().length === 0) {
      return {
        ok: false,
        error: `Featured catalog item ${index + 1} has an empty definition id.`,
        setting: emptySetting(),
      }
    }

    const item: FeaturedCatalogItem = {
      resourceKind: rawItem.resourceKind,
      definitionId: rawItem.definitionId.trim(),
      sortOrder: normalizeSortOrder(rawItem.sortOrder, index),
    }
    const key = identityKey(item)

    if (seenIdentities.has(key)) {
      continue
    }

    seenIdentities.add(key)
    items.push(item)
  }

  return {
    ok: true,
    setting: {
      version: 1,
      items: sortFeaturedCatalogItems(items),
    },
  }
}

export const serializeFeaturedCatalogItemsSetting = (items: FeaturedCatalogItem[]): string => (
  JSON.stringify({
    version: 1,
    items: normalizeFeaturedCatalogItems(items),
  })
)

export const validateFeaturedCatalogItems = (items: FeaturedCatalogItem[]): string[] => {
  const errors: string[] = []
  const seenIdentities = new Set<string>()

  for (const [index, item] of items.entries()) {
    if (!isResourceKind(item.resourceKind)) {
      errors.push(`Item ${index + 1} must be an agent or agent team.`)
      continue
    }

    if (!item.definitionId.trim()) {
      errors.push(`Item ${index + 1} must select a definition.`)
      continue
    }

    const key = identityKey({
      resourceKind: item.resourceKind,
      definitionId: item.definitionId.trim(),
    })
    if (seenIdentities.has(key)) {
      errors.push(`Item ${index + 1} duplicates another ${item.resourceKind === 'AGENT' ? 'agent' : 'team'} entry.`)
      continue
    }

    seenIdentities.add(key)
  }

  return errors
}

export const joinFeaturedCatalogDefinitions = <TDefinition extends FeaturedCatalogDefinition>(
  items: FeaturedCatalogItem[],
  resourceKind: FeaturedCatalogResourceKind,
  definitions: TDefinition[],
): TDefinition[] => {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]))
  const joinedDefinitions: TDefinition[] = []
  const seenDefinitionIds = new Set<string>()

  for (const item of sortFeaturedCatalogItems(items)) {
    if (item.resourceKind !== resourceKind || seenDefinitionIds.has(item.definitionId)) {
      continue
    }

    const definition = definitionsById.get(item.definitionId)
    if (!definition) {
      continue
    }

    joinedDefinitions.push(definition)
    seenDefinitionIds.add(item.definitionId)
  }

  return joinedDefinitions
}

export const splitFeaturedCatalogDefinitions = <TDefinition extends FeaturedCatalogDefinition>(
  items: FeaturedCatalogItem[],
  resourceKind: FeaturedCatalogResourceKind,
  definitions: TDefinition[],
): { featuredDefinitions: TDefinition[]; regularDefinitions: TDefinition[] } => {
  const featuredDefinitions = joinFeaturedCatalogDefinitions(items, resourceKind, definitions)
  const featuredIds = new Set(featuredDefinitions.map((definition) => definition.id))

  return {
    featuredDefinitions,
    regularDefinitions: definitions.filter((definition) => !featuredIds.has(definition.id)),
  }
}
