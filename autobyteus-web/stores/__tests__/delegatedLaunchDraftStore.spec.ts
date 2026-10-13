import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const client = vi.hoisted(() => ({
  loadDelegatedLaunchModelOptions: vi.fn(),
  updateDelegatedLaunchSelections: vi.fn(),
  stopDelegatedExecution: vi.fn(),
}))
vi.mock('~/services/runConfigEditing/delegatedLaunchSelectionClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...client,
}))

import { useDelegatedLaunchDraftStore } from '../delegatedLaunchDraftStore'

/** DS-001 / DS-002 (SR-007): the copies' choices of the open run, saved through the Save bar, and the per-copy Stop. */
const root = { rootKind: 'AGENT_TEAM' as const, rootRunId: 'root' }
const options = (current: string, replacements: string[]) => ({ status: 'ready', options: {
  currentModelIdentifier: current, currentModel: null, unavailableReason: null,
  replacements: replacements.map((llmModelIdentifier) => ({ llmModelIdentifier, providerName: 'p', displayName: llmModelIdentifier, canonicalName: llmModelIdentifier, description: null, configSchema: null, recommended: false })),
} })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(client).forEach((mock) => mock.mockReset())
  client.loadDelegatedLaunchModelOptions.mockResolvedValue({ 'agent:copy': options('opus', ['sonnet']) })
})

describe('delegatedLaunchDraftStore', () => {
  it('binds to a run, loads its copies\' options and starts over for another run', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    expect(client.loadDelegatedLaunchModelOptions).toHaveBeenCalledWith(root)
    expect(store.optionsStatus).toBe('ready')
    store.edit('agent:copy', { llmModelIdentifier: 'opus', llmConfig: null }, { llmModelIdentifier: 'sonnet', llmConfig: null })
    store.bind(root)
    expect(store.dirty).toBe(true)
    store.bind({ rootKind: 'AGENT', rootRunId: 'other' })
    expect(store.dirty).toBe(false)
  })

  it('a change back to what ran is no change; an offered replacement is allowed, another model is not', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    const ran = { llmModelIdentifier: 'opus', llmConfig: null }
    store.edit('agent:copy', ran, { llmModelIdentifier: 'sonnet', llmConfig: null })
    expect(store.changes).toEqual([{ key: 'agent:copy', selection: { llmModelIdentifier: 'sonnet', llmConfig: null } }])
    expect(store.changesAllowed).toBe(true)
    store.edit('agent:copy', ran, { llmModelIdentifier: 'not-offered', llmConfig: null })
    expect(store.changesAllowed).toBe(false)
    store.edit('agent:copy', { llmModelIdentifier: 'ignored', llmConfig: null }, ran)
    expect(store.dirty).toBe(false)
  })

  it('saves the changes with a stopped run\'s own settings, keeps them as recorded and clears the edit', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    client.updateDelegatedLaunchSelections.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved.', fieldErrors: [] })
    store.edit('agent:copy', { llmModelIdentifier: 'opus', llmConfig: null }, { llmModelIdentifier: 'sonnet', llmConfig: null })
    const patch = { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/pm', llmModelIdentifier: 'x', llmConfig: null }
    await expect(store.save([patch])).resolves.toBe(true)
    expect(client.updateDelegatedLaunchSelections).toHaveBeenCalledWith({ ...root,
      changes: [{ key: 'agent:copy', selection: { llmModelIdentifier: 'sonnet', llmConfig: null } }], configuredPatches: [patch] })
    expect(store.dirty).toBe(false)
    expect(store.saved['agent:copy']).toEqual({ llmModelIdentifier: 'sonnet', llmConfig: null })
    expect(store.feedback).toEqual({ kind: 'success', message: 'Saved.' })
    // A live run's view carries no event for the choice: it stays recorded for this run across Settings visits.
    store.bind({ rootKind: 'AGENT_ORG', rootRunId: 'org' })
    expect(store.saved).toEqual({})
    store.bind(root)
    expect(store.saved['agent:copy']).toEqual({ llmModelIdentifier: 'sonnet', llmConfig: null })
  })

  it('keeps the edit and reports a refusal (a copy woken meanwhile, AC-011)', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    client.updateDelegatedLaunchSelections.mockResolvedValue({ success: false, outcome: 'COPY_RUNNING',
      message: 'This copy is running. Stop it, then change its model.', fieldErrors: [{ path: 'changes[0]', message: 'x' }] })
    store.edit('agent:copy', { llmModelIdentifier: 'opus', llmConfig: null }, { llmModelIdentifier: 'sonnet', llmConfig: null })
    await expect(store.save()).resolves.toBe(false)
    expect(store.dirty).toBe(true)
    expect(store.feedback).toEqual({ kind: 'error', message: 'This copy is running. Stop it, then change its model.' })
    expect(store.fieldErrors).toEqual([{ path: 'changes[0]', message: 'x' }])
  })

  it('tracks a Stop in flight per run and copy, and reports older copies it could not stop', async () => {
    const store = useDelegatedLaunchDraftStore()
    let finish!: (value: unknown) => void
    client.stopDelegatedExecution.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const stopping = store.stop(root, { teamRunId: 'se-copy' })
    expect(store.isStopping(root, { teamRunId: 'se-copy' })).toBe(true)
    expect(store.isStopping({ ...root, rootRunId: 'other' }, { teamRunId: 'se-copy' })).toBe(false)
    finish({ success: true, outcome: 'STOPPED', message: 'Stopped. 1 older copy kept running.', notStoppedUnattributed: 1 })
    await expect(stopping).resolves.toBe(true)
    expect(store.isStopping(root, { teamRunId: 'se-copy' })).toBe(false)
    expect(store.stopFeedback).toEqual({ kind: 'info', message: 'Stopped. 1 older copy kept running.' })
  })
})
