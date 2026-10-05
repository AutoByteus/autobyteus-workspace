import { describe, expect, it } from 'vitest'
import { chatNavStartOrder, definitionStartOrder, resolveStartModel, type StartModelCatalog } from '../startModelDefaults'

const catalog = (models: Record<string, string[]>, disabled: string[] = []): StartModelCatalog => ({
  ensureAvailability: async () => undefined,
  isRuntimeEnabled: (runtimeKind) => !disabled.includes(runtimeKind),
  ensureCatalog: async () => undefined,
  models: (runtimeKind) => models[runtimeKind] ?? [],
})

describe('resolveStartModel (REQ-021)', () => {
  const models = { autobyteus: ['first', 'second'], codex_app_server: ['gpt-codex'] }

  it('takes the definition default when its runtime is enabled and the model exists, keeping its config', async () => {
    await expect(resolveStartModel([
      { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex', llmConfig: { reasoning_effort: 'high' } },
      { runtimeKind: 'autobyteus', llmModelIdentifier: 'second' },
    ], catalog(models), 'autobyteus')).resolves.toEqual({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex', llmConfig: { reasoning_effort: 'high' } })
  })

  it('skips an unavailable model or a disabled runtime, then the last chat model', async () => {
    await expect(resolveStartModel([
      { runtimeKind: 'codex_app_server', llmModelIdentifier: 'retired' },
      { runtimeKind: 'autobyteus', llmModelIdentifier: 'second' },
    ], catalog(models), 'autobyteus')).resolves.toMatchObject({ llmModelIdentifier: 'second' })
    await expect(resolveStartModel([
      { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex' },
    ], catalog(models, ['codex_app_server']), 'autobyteus')).resolves.toMatchObject({ llmModelIdentifier: 'first' })
  })

  it('ends with the default runtime’s first model, or nothing when it has none', async () => {
    await expect(resolveStartModel([null, undefined], catalog(models), 'autobyteus')).resolves.toEqual({ runtimeKind: 'autobyteus', llmModelIdentifier: 'first', llmConfig: null })
    await expect(resolveStartModel([], catalog({}), 'autobyteus')).resolves.toBeNull()
  })
})

describe('start orders (DI-006b)', () => {
  const models = { autobyteus: ['first', 'second'], codex_app_server: ['gpt-codex'] }
  const definitionDefaults = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex', llmConfig: { reasoning_effort: 'high' } }
  const lastChatModel = { runtimeKind: 'autobyteus', llmModelIdentifier: 'second', llmConfig: { reasoning_effort: 'low' } }

  it('Run: the definition default (with its own config) first, then the last chat model', async () => {
    const order = definitionStartOrder({ definitionDefaults, lastChatModel })
    expect(order).toEqual([definitionDefaults, lastChatModel])
    expect(await resolveStartModel(order, catalog(models), 'autobyteus')).toEqual(definitionDefaults)
    expect(await resolveStartModel(order, catalog(models, ['codex_app_server']), 'autobyteus'))
      .toEqual({ runtimeKind: 'autobyteus', llmModelIdentifier: 'second', llmConfig: { reasoning_effort: 'low' } })
  })

  it('Chat nav: the last chat model first (without its config), then the default chat agent’s default', async () => {
    const order = chatNavStartOrder({ lastChatModel, assistantDefaults: definitionDefaults })
    expect(order).toEqual([{ ...lastChatModel, llmConfig: null }, definitionDefaults])
    expect(await resolveStartModel(order, catalog(models), 'autobyteus'))
      .toEqual({ runtimeKind: 'autobyteus', llmModelIdentifier: 'second', llmConfig: null })
    expect(chatNavStartOrder({ lastChatModel: null, assistantDefaults: null })).toEqual([null, null])
  })
})
