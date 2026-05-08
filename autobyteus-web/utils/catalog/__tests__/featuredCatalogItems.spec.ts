import { describe, expect, it } from 'vitest'
import {
  parseFeaturedCatalogItemsSetting,
  serializeFeaturedCatalogItemsSetting,
  splitFeaturedCatalogDefinitions,
  validateFeaturedCatalogItems,
} from '../featuredCatalogItems'

describe('featuredCatalogItems', () => {
  it('parses, sorts, and coalesces duplicate rows on safe reads', () => {
    const result = parseFeaturedCatalogItemsSetting(JSON.stringify({
      version: 1,
      items: [
        { resourceKind: 'AGENT', definitionId: 'b', sortOrder: 20 },
        { resourceKind: 'AGENT', definitionId: 'a', sortOrder: 10 },
        { resourceKind: 'AGENT', definitionId: 'a', sortOrder: 30 },
      ],
    }))

    expect(result.ok).toBe(true)
    expect(result.setting.items.map((item) => item.definitionId)).toEqual(['a', 'b'])
  })

  it('returns an empty setting for blank or invalid reads without throwing', () => {
    expect(parseFeaturedCatalogItemsSetting('').setting.items).toEqual([])
    const invalid = parseFeaturedCatalogItemsSetting('{')
    expect(invalid.ok).toBe(false)
    expect(invalid.setting.items).toEqual([])
  })

  it('serializes rows with deterministic sort orders', () => {
    expect(serializeFeaturedCatalogItemsSetting([
      { resourceKind: 'AGENT_TEAM', definitionId: 'team-a', sortOrder: Number.NaN },
      { resourceKind: 'AGENT', definitionId: 'agent-a', sortOrder: 5 },
    ])).toBe(JSON.stringify({
      version: 1,
      items: [
        { resourceKind: 'AGENT', definitionId: 'agent-a', sortOrder: 5 },
        { resourceKind: 'AGENT_TEAM', definitionId: 'team-a', sortOrder: 10 },
      ],
    }))
  })

  it('validates duplicate resource kind and definition id pairs', () => {
    expect(validateFeaturedCatalogItems([
      { resourceKind: 'AGENT', definitionId: 'agent-a', sortOrder: 10 },
      { resourceKind: 'AGENT', definitionId: 'agent-a', sortOrder: 20 },
      { resourceKind: 'AGENT_TEAM', definitionId: 'agent-a', sortOrder: 30 },
    ])).toHaveLength(1)
  })

  it('splits featured definitions from regular definitions by resource kind', () => {
    const definitions = [
      { id: 'agent-a', name: 'Agent A' },
      { id: 'agent-b', name: 'Agent B' },
    ]

    const split = splitFeaturedCatalogDefinitions([
      { resourceKind: 'AGENT_TEAM', definitionId: 'agent-b', sortOrder: 1 },
      { resourceKind: 'AGENT', definitionId: 'agent-b', sortOrder: 2 },
      { resourceKind: 'AGENT', definitionId: 'missing-agent', sortOrder: 3 },
    ], 'AGENT', definitions)

    expect(split.featuredDefinitions.map((definition) => definition.id)).toEqual(['agent-b'])
    expect(split.regularDefinitions.map((definition) => definition.id)).toEqual(['agent-a'])
  })
})
