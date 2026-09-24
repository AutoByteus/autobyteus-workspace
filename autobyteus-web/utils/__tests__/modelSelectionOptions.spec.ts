import { describe, expect, it } from 'vitest'
import type { ModelInfo, ProviderWithModels } from '~/stores/llmProviderConfig'
import { buildModelSelectionGroups } from '../modelSelectionOptions'

const model = (
  modelIdentifier: string,
  fields: Partial<ModelInfo> = {},
): ModelInfo => ({
  modelIdentifier,
  name: modelIdentifier,
  value: modelIdentifier,
  canonicalName: modelIdentifier,
  providerId: 'ANTHROPIC',
  providerName: 'Anthropic',
  providerType: 'ANTHROPIC' as ModelInfo['providerType'],
  runtime: 'api',
  ...fields,
})

const group = (models: ModelInfo[], name = 'Anthropic'): ProviderWithModels => ({
  provider: { id: name.toUpperCase(), name, providerType: 'ANTHROPIC' as ModelInfo['providerType'], isCustom: false, catalogMode: 'STATIC' },
  models,
})

// Rows as reported by the Claude SDK on 2026-09-24, after server mapping (GraphQL sorts by name).
const claudeCatalog = group([
  model('default', {
    name: 'Default (recommended)',
    description: 'Opus 5.5 with 1M context · Best for everyday, complex tasks',
    canonicalName: 'claude-opus-5-5[1m]',
    selectionPresentation: { recommended: false, aliasOfModelIdentifier: 'opus[1m]' },
  }),
  model('claude-fable-5[1m]', {
    name: 'Fable',
    description: 'Fable 5 · Most capable for your hardest and longest-running tasks',
    canonicalName: 'claude-fable-5',
    selectionPresentation: { recommended: false, aliasOfModelIdentifier: null },
  }),
  model('haiku', {
    name: 'Haiku',
    description: 'Haiku 4.5 · Fastest for quick answers',
    canonicalName: 'claude-haiku-4-5-20251001',
    selectionPresentation: { recommended: false, aliasOfModelIdentifier: null },
  }),
  model('opus[1m]', {
    name: 'Opus (1M context)',
    description: 'Opus 5.5 with 1M context · Best for everyday, complex tasks',
    canonicalName: 'claude-opus-5-5[1m]',
    selectionPresentation: { recommended: true, aliasOfModelIdentifier: null },
  }),
  model('sonnet', {
    name: 'Sonnet',
    description: 'Sonnet 5 · Efficient for routine tasks',
    canonicalName: 'claude-sonnet-5',
    selectionPresentation: { recommended: false, aliasOfModelIdentifier: null },
  }),
])

describe('buildModelSelectionGroups', () => {
  it('folds the Claude default alias, labels by canonical ID and orders recommended first', () => {
    expect(buildModelSelectionGroups([claudeCatalog], 'claude_agent_sdk')).toEqual([{
      label: 'Anthropic',
      items: [
        {
          id: 'opus[1m]',
          aliasIds: ['default'],
          recommended: true,
          name: 'claude-opus-5-5[1m]',
          description: 'Opus (1M context) · Opus 5.5 with 1M context · Best for everyday, complex tasks',
          selectedLabel: 'Anthropic / claude-opus-5-5[1m]',
        },
        {
          id: 'claude-fable-5[1m]',
          name: 'claude-fable-5',
          description: 'Fable · Fable 5 · Most capable for your hardest and longest-running tasks',
          selectedLabel: 'Anthropic / claude-fable-5',
        },
        {
          id: 'haiku',
          name: 'claude-haiku-4-5-20251001',
          description: 'Haiku · Haiku 4.5 · Fastest for quick answers',
          selectedLabel: 'Anthropic / claude-haiku-4-5-20251001',
        },
        {
          id: 'sonnet',
          name: 'claude-sonnet-5',
          description: 'Sonnet · Sonnet 5 · Efficient for routine tasks',
          selectedLabel: 'Anthropic / claude-sonnet-5',
        },
      ],
    }])
  })

  it('keeps a Claude row without canonical ID as its own option labeled by its SDK value', () => {
    const [options] = buildModelSelectionGroups([group([
      model('sonnet', { name: 'Sonnet', description: 'Sonnet 5 · Efficient for routine tasks', canonicalName: '' }),
      model('bare', { name: 'bare', canonicalName: 'bare' }),
    ])], 'claude_agent_sdk')

    expect(options?.items).toEqual([
      expect.objectContaining({ id: 'bare', name: 'bare', description: null, selectedLabel: 'Anthropic / bare' }),
      expect.objectContaining({ id: 'sonnet', name: 'sonnet', description: 'Sonnet · Sonnet 5 · Efficient for routine tasks' }),
    ])
  })

  it('lists an alias row whose target is missing from the group instead of hiding it', () => {
    const [options] = buildModelSelectionGroups([group([
      model('default', {
        name: 'Default (recommended)',
        canonicalName: 'claude-opus-5-5[1m]',
        selectionPresentation: { recommended: false, aliasOfModelIdentifier: 'opus[1m]' },
      }),
      model('sonnet', { canonicalName: 'claude-sonnet-5' }),
    ])], 'claude_agent_sdk')

    expect(options?.items.map((item) => [item.id, item.aliasIds ?? []])).toEqual([
      ['default', []],
      ['sonnet', []],
    ])
  })

  it('keeps non-Claude runtimes on their existing labels and catalog order', () => {
    const openAi = group([
      model('gpt-b', { name: 'GPT B', description: '  Second  ', providerType: 'OPENAI' as ModelInfo['providerType'] }),
      model('gpt-a', { name: 'GPT A', providerType: 'OPENAI' as ModelInfo['providerType'] }),
    ], 'OpenAI')

    expect(buildModelSelectionGroups([openAi], 'codex_app_server')).toEqual([{
      label: 'OpenAI',
      items: [
        { id: 'gpt-b', name: 'GPT B', description: 'Second', selectedLabel: 'OpenAI / GPT B' },
        { id: 'gpt-a', name: 'GPT A', description: null, selectedLabel: 'OpenAI / GPT A' },
      ],
    }])
    expect(buildModelSelectionGroups([openAi], 'autobyteus')[0]?.items.map((item) => item.name))
      .toEqual(['gpt-b', 'gpt-a'])
    expect(buildModelSelectionGroups([openAi], '')[0]?.items.map((item) => item.name))
      .toEqual(['gpt-b', 'gpt-a'])
  })
})
