import { describe, expect, it, vi } from 'vitest'
import { chatNavStartOrder, definitionStartOrder, loadStartRuntimes, resolveStartModel, type StartModelCatalog } from '../startModelDefaults'

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

describe('loadStartRuntimes (CR-004)', () => {
  it('loads availability first, then each enabled runtime’s catalog once; disabled and empty runtimes are skipped', async () => {
    const order: string[] = []
    const catalog: StartModelCatalog = {
      ensureAvailability: vi.fn(async () => { order.push('availability') }),
      isRuntimeEnabled: (runtimeKind) => runtimeKind !== 'codex_app_server',
      ensureCatalog: vi.fn(async (runtimeKind: string) => { order.push(runtimeKind) }),
      models: () => [],
    }
    await loadStartRuntimes(['autobyteus', 'claude_agent_sdk', 'autobyteus', 'codex_app_server', null, ' ', undefined], catalog)
    expect(order[0]).toBe('availability')
    expect(order.slice(1).sort()).toEqual(['autobyteus', 'claude_agent_sdk'])
  })
})
