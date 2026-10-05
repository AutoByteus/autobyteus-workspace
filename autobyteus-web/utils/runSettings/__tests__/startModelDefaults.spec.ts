import { describe, expect, it } from 'vitest'
import { resolveStartModel, type StartModelCatalog } from '../startModelDefaults'

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
