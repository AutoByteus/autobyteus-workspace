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
const unreadable = { status: 'unavailable', options: null, message: 'The model list of Claude Agent SDK could not be read. Try again.' }
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
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    store.bind(root)
    expect(store.dirty).toBe(true)
    store.bind({ rootKind: 'AGENT', rootRunId: 'other' })
    expect(store.dirty).toBe(false)
  })

  it('re-reads the copies\' options in the background: the options shown stay until the answer, and a failed read keeps them (REQ-010)', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    let answer!: (value: unknown) => void
    client.loadDelegatedLaunchModelOptions.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))

    const reloading = store.reloadOptions()
    expect(store.optionsStatus).toBe('ready')
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet']))

    answer({ 'agent:copy': options('opus', ['sonnet', 'fable']) })
    await expect(reloading).resolves.toBe(true)
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet', 'fable']))

    client.loadDelegatedLaunchModelOptions.mockRejectedValueOnce(new Error('Model options unavailable.'))
    await expect(store.reloadOptions()).resolves.toBe(false)
    expect(store.optionsStatus).toBe('ready')
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet', 'fable']))
  })

  // API-14 (CR-004): a copy whose runtime list the server could not read never replaces the options shown.
  it('merges a re-read per copy: a readable copy replaces, an unreadable one keeps its options, and the read answers false', async () => {
    const store = useDelegatedLaunchDraftStore()
    client.loadDelegatedLaunchModelOptions.mockResolvedValue({ 'agent:copy': options('opus', ['sonnet']), 'team:t': options('haiku', ['sonnet']) })
    store.bind(root)
    await flush()
    client.loadDelegatedLaunchModelOptions.mockResolvedValueOnce({ 'agent:copy': options('opus', ['sonnet', 'fable']), 'team:t': unreadable })

    await expect(store.reloadOptions()).resolves.toBe(false)
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet', 'fable']))
    expect(store.optionsByKey['team:t']).toEqual(options('haiku', ['sonnet']))
    expect(store.optionsStatus).toBe('ready')

    client.loadDelegatedLaunchModelOptions.mockResolvedValueOnce({ 'agent:copy': options('opus', ['fable']), 'team:t': options('haiku', ['opus']) })
    await expect(store.reloadOptions()).resolves.toBe(true)
    expect(store.optionsByKey['team:t']).toEqual(options('haiku', ['opus']))
  })

  it('an unreadable first read is unavailable with the server\'s message, and a stale unreadable answer is not a failure', async () => {
    const store = useDelegatedLaunchDraftStore()
    client.loadDelegatedLaunchModelOptions.mockResolvedValue({ 'agent:copy': unreadable })
    store.bind(root)
    await flush()
    expect(store.optionsByKey['agent:copy']).toEqual(unreadable)

    let answer!: (value: unknown) => void
    client.loadDelegatedLaunchModelOptions.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))
    const reloading = store.reloadOptions()
    store.bind({ rootKind: 'AGENT', rootRunId: 'other' })
    answer({ 'agent:copy': unreadable })
    await expect(reloading).resolves.toBe(true)
  })

  it('an options answer made stale by another run or a newer read is not applied and is not a failure', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    let answer!: (value: unknown) => void
    client.loadDelegatedLaunchModelOptions.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))

    const reloading = store.reloadOptions()
    store.bind({ rootKind: 'AGENT', rootRunId: 'other' })
    answer({ 'agent:stale': options('x', []) })

    await expect(reloading).resolves.toBe(true)
    expect(store.optionsByKey['agent:stale']).toBeUndefined()
  })

  it('has nothing to re-read without a bound run', async () => {
    const store = useDelegatedLaunchDraftStore()
    client.loadDelegatedLaunchModelOptions.mockClear()

    await expect(store.reloadOptions()).resolves.toBe(true)
    expect(client.loadDelegatedLaunchModelOptions).not.toHaveBeenCalled()
  })

  it('a change back to what ran is no change; an offered replacement is allowed, another model is not', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    const ran = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }
    store.edit('agent:copy', ran, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    expect(store.changes).toEqual([{ key: 'agent:copy', selection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null } }])
    expect(store.changesAllowed).toBe(true)
    store.edit('agent:copy', ran, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'not-offered', llmConfig: null })
    expect(store.changesAllowed).toBe(false)
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'ignored', llmConfig: null }, ran)
    expect(store.dirty).toBe(false)
  })

  it('saves the changes with a stopped run\'s own settings and clears the edit; the run, not the store, records them', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    client.updateDelegatedLaunchSelections.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved.', fieldErrors: [] })
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    const patch = { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/pm', runtimeKind: 'codex_app_server', llmModelIdentifier: 'x', llmConfig: null }
    await expect(store.save([patch], async () => true)).resolves.toBe(true)
    expect(client.updateDelegatedLaunchSelections).toHaveBeenCalledWith({ ...root,
      changes: [{ key: 'agent:copy', selection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null } }], configuredPatches: [patch] })
    expect(store.dirty).toBe(false)
    expect(store.feedback).toEqual({ kind: 'success', message: 'Saved.' })
    // CR-002: no client copy of the saved choice; rows read it from the run's view or Settings' reload.
    expect(store.$state).not.toHaveProperty('savedByRoot')
    expect(store).not.toHaveProperty('saved')
  })

  it('keeps the edit and reports a refusal (a copy woken meanwhile, AC-011)', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    client.updateDelegatedLaunchSelections.mockResolvedValue({ success: false, outcome: 'COPY_RUNNING',
      message: 'This copy is running. Stop it, then change its model.', fieldErrors: [{ path: 'changes[0]', message: 'x' }] })
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    await expect(store.save([], async () => true)).resolves.toBe(false)
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

  it('treats another agent runtime as a change the server validates: allowed whatever the old runtime offers, undone when chosen back (autobyteus-348)', async () => {
    const store = useDelegatedLaunchDraftStore()
    store.bind(root)
    await flush()
    const ran = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }
    store.edit('agent:copy', ran, { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus', llmConfig: null })
    expect(store.changes).toEqual([{ key: 'agent:copy', selection: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus', llmConfig: null } }])
    expect(store.changesAllowed).toBe(true)
    store.edit('agent:copy', ran, { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null })
    expect(store.dirty).toBe(true)
    store.edit('agent:copy', ran, ran)
    expect(store.dirty).toBe(false)
  })
})

it.each(['mutation', 'readback'])('ignores an old %s completion after navigating away and back to the same root', async phase => {
  const store = useDelegatedLaunchDraftStore()
  store.bind(root)
  store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
  let finish!: (value: any) => void
  const pending = new Promise<any>(resolve => { finish = resolve })
  client.updateDelegatedLaunchSelections.mockReturnValue(phase === 'mutation' ? pending : Promise.resolve({ success: true, message: 'Saved' }))
  const reconcile = vi.fn(() => phase === 'readback' ? pending : Promise.resolve(true))
  const saving = store.save([], reconcile)
  await flush()
  store.bind(null); store.bind(root)
  store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'other', llmConfig: null })
  finish(phase === 'mutation' ? { success: true, message: 'Saved' } : true)
  expect(await saving).toBe(false)
  expect(store.edits['agent:copy'].llmModelIdentifier).toBe('other')
  expect(store.feedback).toBeNull()
  expect(store.saving).toBe(false)
  if (phase === 'mutation') expect(reconcile).not.toHaveBeenCalled()

})
