import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const client = vi.hoisted(() => ({
  loadDelegatedRunOptions: vi.fn(),
  saveDelegatedRuns: vi.fn(),
  terminateDelegatedRun: vi.fn(),
}))
vi.mock('~/services/runConfigEditing/delegatedLaunchSelectionClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...client,
}))

import { useDelegatedLaunchDraftStore } from '../delegatedLaunchDraftStore'

/**
 * The delegated runs' choices of the open run, saved through the Save bar, and the per-run Stop (SR-007; autobyteus-461
 * SR-064 … SR-066: each run reached as itself, its options by its own query, its save and Stop its own).
 */
const root = { rootKind: 'AGENT_TEAM' as const, rootRunId: 'root' }
const targets = new Map<any, any>([['agent:copy', { kind: 'agent', agentRunId: 'copy' }], ['team:t', { kind: 'team', teamRunId: 't' }]])
/** Each run's own options, as the client answers them: `complete` false when a run's could not be read. */
const answer = (options: Record<string, unknown>, complete = true) => ({ options, complete })
const bound = (store: ReturnType<typeof useDelegatedLaunchDraftStore>) => { store.bind(root); store.setTargets(targets); return store }
const rows = { running: () => false, nameOf: (key: string) => key }
const options = (current: string, replacements: string[]) => ({ status: 'ready', options: {
  currentModelIdentifier: current, currentModel: null, unavailableReason: null,
  replacements: replacements.map((llmModelIdentifier) => ({ llmModelIdentifier, providerName: 'p', displayName: llmModelIdentifier, canonicalName: llmModelIdentifier, description: null, configSchema: null, recommended: false })),
} })
const unreadable = { status: 'unavailable', options: null, message: 'The model list of Claude Agent SDK could not be read. Try again.' }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(client).forEach((mock) => mock.mockReset())
  client.loadDelegatedRunOptions.mockResolvedValue(answer({ 'agent:copy': options('opus', ['sonnet']) }))
})

describe('delegatedLaunchDraftStore', () => {
  it('binds to a run, loads its copies\' options and starts over for another run', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
    await flush()
    expect(client.loadDelegatedRunOptions).toHaveBeenCalledWith(targets)
    expect(store.optionsStatus).toBe('ready')
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    store.bind(root)
    expect(store.dirty).toBe(true)
    store.bind({ rootKind: 'AGENT', rootRunId: 'other' })
    expect(store.dirty).toBe(false)
  })

  it('re-reads the copies\' options in the background: the options shown stay until the answer, and a failed read keeps them (REQ-010)', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
    await flush()
    let resolveReload!: (value: unknown) => void
    client.loadDelegatedRunOptions.mockReturnValueOnce(new Promise((resolve) => { resolveReload = resolve }))

    const reloading = store.reloadOptions()
    expect(store.optionsStatus).toBe('ready')
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet']))

    resolveReload(answer({ 'agent:copy': options('opus', ['sonnet', 'fable']) }))
    await expect(reloading).resolves.toBe(true)
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet', 'fable']))

    client.loadDelegatedRunOptions.mockResolvedValueOnce(answer({}, false))
    await expect(store.reloadOptions()).resolves.toBe(false)
    expect(store.optionsStatus).toBe('ready')
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet', 'fable']))
  })

  // API-14 (CR-004): a copy whose runtime list the server could not read never replaces the options shown.
  it('merges a re-read per copy: a readable copy replaces, an unreadable one keeps its options, and the read answers false', async () => {
    const store = useDelegatedLaunchDraftStore()
    client.loadDelegatedRunOptions.mockResolvedValue(answer({ 'agent:copy': options('opus', ['sonnet']), 'team:t': options('haiku', ['sonnet']) }))
    bound(store)
    await flush()
    client.loadDelegatedRunOptions.mockResolvedValueOnce(answer({ 'agent:copy': options('opus', ['sonnet', 'fable']), 'team:t': unreadable }))

    await expect(store.reloadOptions()).resolves.toBe(false)
    expect(store.optionsByKey['agent:copy']).toEqual(options('opus', ['sonnet', 'fable']))
    expect(store.optionsByKey['team:t']).toEqual(options('haiku', ['sonnet']))
    expect(store.optionsStatus).toBe('ready')

    client.loadDelegatedRunOptions.mockResolvedValueOnce(answer({ 'agent:copy': options('opus', ['fable']), 'team:t': options('haiku', ['opus']) }))
    await expect(store.reloadOptions()).resolves.toBe(true)
    expect(store.optionsByKey['team:t']).toEqual(options('haiku', ['opus']))
  })

  it('an unreadable first read is unavailable with the server\'s message, and a stale unreadable answer is not a failure', async () => {
    const store = useDelegatedLaunchDraftStore()
    client.loadDelegatedRunOptions.mockResolvedValue(answer({ 'agent:copy': unreadable }))
    bound(store)
    await flush()
    expect(store.optionsByKey['agent:copy']).toEqual(unreadable)

    let resolveReload!: (value: unknown) => void
    client.loadDelegatedRunOptions.mockReturnValueOnce(new Promise((resolve) => { resolveReload = resolve }))
    const reloading = store.reloadOptions()
    store.bind({ rootKind: 'AGENT', rootRunId: 'other' })
    resolveReload(answer({ 'agent:copy': unreadable }))
    await expect(reloading).resolves.toBe(true)
  })

  it('an options answer made stale by another run or a newer read is not applied and is not a failure', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
    await flush()
    let resolveReload!: (value: unknown) => void
    client.loadDelegatedRunOptions.mockReturnValueOnce(new Promise((resolve) => { resolveReload = resolve }))

    const reloading = store.reloadOptions()
    store.bind({ rootKind: 'AGENT', rootRunId: 'other' })
    resolveReload(answer({ 'agent:stale': options('x', []) }))

    await expect(reloading).resolves.toBe(true)
    expect(store.optionsByKey['agent:stale']).toBeUndefined()
  })

  it('has nothing to re-read without a bound run', async () => {
    const store = useDelegatedLaunchDraftStore()
    client.loadDelegatedRunOptions.mockClear()

    await expect(store.reloadOptions()).resolves.toBe(true)
    expect(client.loadDelegatedRunOptions).not.toHaveBeenCalled()
  })

  it('a change back to what ran is no change; an offered replacement is allowed, another model is not', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
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

  it('saves the changes by each run\'s own save and clears the edit; the runs, not the store, record them (SR-064)', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
    await flush()
    const answered = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null }
    client.saveDelegatedRuns.mockResolvedValue({ success: true, message: 'Saved.', fieldErrors: [], saved: { 'agent:copy': answered } })
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    await expect(store.save(rows, async () => true)).resolves.toBe(true)
    expect(client.saveDelegatedRuns).toHaveBeenCalledWith({ targets, nameOf: rows.nameOf,
      changes: [{ key: 'agent:copy', selection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null } }] })
    expect(store.dirty).toBe(false)
    expect(store.feedback).toEqual({ kind: 'success', message: 'Saved.' })
    // CR-002: no client copy of the edit; SR-084: no overlay of what the runs saved either. Each row shows its run's
    // launch from the tree's next answer (a save tells the trees that hold its row, SR-086 G-B1).
    expect(store.$state).not.toHaveProperty('savedByRoot')
    expect(store.$state).not.toHaveProperty('stored')
  })

  it('a row whose run is running refuses the Save before any write, naming it (SR-064)', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    await expect(store.save({ running: () => true, nameOf: () => 'writer' }, async () => true)).resolves.toBe(false)
    expect(client.saveDelegatedRuns).not.toHaveBeenCalled()
    expect(store.feedback).toEqual({ kind: 'error', message: "writer is running, so its settings can't be saved now. Stop it, then save again." })
    expect(store.dirty).toBe(true)
  })

  it('keeps the edit and reports a refusal, naming the runs already saved; the rows are read again (SR-064)', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
    client.saveDelegatedRuns.mockResolvedValue({ success: false,
      message: 'team:t was not saved: The run is running. Saved: agent:copy.', fieldErrors: [{ path: 'selectionPatches[0]', message: 'x' }], saved: {} })
    store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    const reconcile = vi.fn(async () => true)
    await expect(store.save(rows, reconcile)).resolves.toBe(false)
    expect(store.dirty).toBe(true)
    expect(store.feedback).toEqual({ kind: 'error', message: 'team:t was not saved: The run is running. Saved: agent:copy.' })
    expect(store.fieldErrors).toEqual([{ path: 'selectionPatches[0]', message: 'x' }])
    expect(reconcile).toHaveBeenCalledOnce()
  })

  it('tracks a Stop in flight per run, stops the run as itself and reports a refusal (SR-066)', async () => {
    const store = useDelegatedLaunchDraftStore()
    let finish!: (value: unknown) => void
    client.terminateDelegatedRun.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const stopping = store.stop(root, { teamRunId: 'se-copy' })
    expect(client.terminateDelegatedRun).toHaveBeenCalledWith({ teamRunId: 'se-copy' })
    expect(store.isStopping(root, { teamRunId: 'se-copy' })).toBe(true)
    expect(store.isStopping({ ...root, rootRunId: 'other' }, { teamRunId: 'se-copy' })).toBe(false)
    finish({ success: true, message: 'Stopped.' })
    await expect(stopping).resolves.toBe(true)
    expect(store.isStopping(root, { teamRunId: 'se-copy' })).toBe(false)
    expect(store.stopFeedback).toBeNull()
    client.terminateDelegatedRun.mockResolvedValue({ success: false, message: "Couldn't reach docker." })
    await expect(store.stop(root, { agentRunId: 'far' })).resolves.toBe(false)
    expect(store.stopFeedback).toEqual({ kind: 'error', message: "Couldn't reach docker." })
  })

  it('treats another agent runtime as a change the server validates: allowed whatever the old runtime offers, undone when chosen back (autobyteus-348)', async () => {
    const store = useDelegatedLaunchDraftStore()
    bound(store)
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
  bound(store)
  store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
  let finish!: (value: any) => void
  const pending = new Promise<any>(resolve => { finish = resolve })
  client.saveDelegatedRuns.mockReturnValue(phase === 'mutation' ? pending : Promise.resolve({ success: true, message: 'Saved', fieldErrors: [] }))
  const reconcile = vi.fn(() => phase === 'readback' ? pending : Promise.resolve(true))
  const saving = store.save(rows, reconcile)
  await flush()
  store.bind(null); bound(store)
  store.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'other', llmConfig: null })
  finish(phase === 'mutation' ? { success: true, message: 'Saved', fieldErrors: [] } : true)
  expect(await saving).toBe(false)
  expect(store.edits['agent:copy'].llmModelIdentifier).toBe('other')
  expect(store.feedback).toBeNull()
  expect(store.saving).toBe(false)
  if (phase === 'mutation') expect(reconcile).not.toHaveBeenCalled()

})
