import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ loadExistingRunModelOptions: vi.fn() }))
const workspaces = vi.hoisted(() => ({ existingAgentOrgWorkspacesValid: vi.fn(() => true) }))
vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => client)
vi.mock('~/services/runConfigEditing/existingAgentOrgWorkspaceDraft', () => workspaces)
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ bindingRevision: 1 }) }))

import { existingRunModelOptionsActions } from '../existingRunModelOptionsActions'

const ready = (replacements: string[]) => ({ status: 'ready', options: { currentModelIdentifier: 'opus', currentModel: null, unavailableReason: null,
  replacements: replacements.map((llmModelIdentifier) => ({ llmModelIdentifier })) } })

const UNREADABLE = 'The model list of Claude Agent SDK could not be read. Try again.'
// What the options client maps a row to when the server answers modelListReadable=false (SR-004).
const unreadable = { status: 'unavailable', options: null, message: UNREADABLE }

/** The store's state, as the mixin sees it (`this`). */
const host = (draft: unknown = { kind: 'agent', runId: 'run' }) => {
  const state: any = { draft, optionsRequestId: 0, modelOptionsByAddress: { '/': ready(['sonnet']) }, deriveSchemaStates: vi.fn() }
  state.reloadModelOptions = existingRunModelOptionsActions.reloadModelOptions
  state.refreshModelOptions = existingRunModelOptionsActions.refreshModelOptions
  return state
}

beforeEach(() => {
  client.loadExistingRunModelOptions.mockReset()
  workspaces.existingAgentOrgWorkspacesValid.mockReturnValue(true)
})

describe('existingRunModelOptionsActions.reloadModelOptions (REQ-010, QR-001)', () => {
  it('keeps the options shown while it reads, then replaces them and re-derives the save readiness', async () => {
    const store = host()
    let answer!: (value: unknown) => void
    client.loadExistingRunModelOptions.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))

    const reloading = store.reloadModelOptions()
    expect(store.modelOptionsByAddress['/']).toEqual(ready(['sonnet']))
    expect(store.deriveSchemaStates).not.toHaveBeenCalled()

    answer({ '/': ready(['sonnet', 'fable']) })
    await expect(reloading).resolves.toBe(true)
    expect(store.modelOptionsByAddress['/']).toEqual(ready(['sonnet', 'fable']))
    expect(store.deriveSchemaStates).toHaveBeenCalledOnce()
  })

  it('keeps the options and answers false when the read fails', async () => {
    const store = host()
    client.loadExistingRunModelOptions.mockRejectedValueOnce(new Error('Model options unavailable.'))

    await expect(store.reloadModelOptions()).resolves.toBe(false)
    expect(store.modelOptionsByAddress['/']).toEqual(ready(['sonnet']))
    expect(store.deriveSchemaStates).not.toHaveBeenCalled()
  })

  // API-14 (CR-004): the server answers, it does not throw, when the runtime's list cannot be read.
  it('keeps the options that were shown and answers false when the server answers that the list could not be read', async () => {
    const store = host({ kind: 'team', teamRunId: 'team' })
    client.loadExistingRunModelOptions.mockResolvedValueOnce({ '/': unreadable })

    await expect(store.reloadModelOptions()).resolves.toBe(false)
    expect(store.modelOptionsByAddress['/']).toEqual(ready(['sonnet']))
    expect(store.deriveSchemaStates).toHaveBeenCalledOnce()
  })

  it('shows unavailable with the owner\'s message when nothing was loaded before (the first read of an edit)', async () => {
    const store = host({ kind: 'team', teamRunId: 'team' })
    store.modelOptionsByAddress = { '/': { status: 'loading', options: null } }
    client.loadExistingRunModelOptions.mockResolvedValueOnce({ '/': unreadable })

    await expect(store.reloadModelOptions()).resolves.toBe(false)
    expect(store.modelOptionsByAddress['/']).toEqual(unreadable)
  })

  it('merges per scope: a readable scope is replaced, an unreadable one keeps its options, and the read is a failure', async () => {
    const store = host({ kind: 'team', teamRunId: 'team' })
    store.modelOptionsByAddress = { '/': ready(['sonnet']), '/member': ready(['opus']) }
    client.loadExistingRunModelOptions.mockResolvedValueOnce({ '/': ready(['sonnet', 'fable']), '/member': unreadable })

    await expect(store.reloadModelOptions()).resolves.toBe(false)
    expect(store.modelOptionsByAddress).toEqual({ '/': ready(['sonnet', 'fable']), '/member': ready(['opus']) })
  })

  it('does not apply an answer that a newer read made stale, and does not call that a failure', async () => {
    const store = host()
    let answer!: (value: unknown) => void
    client.loadExistingRunModelOptions.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))

    const reloading = store.reloadModelOptions()
    store.optionsRequestId += 1
    answer({ '/': ready(['stale']) })

    await expect(reloading).resolves.toBe(true)
    expect(store.modelOptionsByAddress['/']).toEqual(ready(['sonnet']))
  })

  it('has nothing to read without a draft, or for an AgentOrg whose workspaces are not valid yet', async () => {
    await expect(host(null).reloadModelOptions()).resolves.toBe(true)
    workspaces.existingAgentOrgWorkspacesValid.mockReturnValue(false)
    await expect(host({ kind: 'agent_org', executionTree: {}, workspaceDraft: {} }).reloadModelOptions()).resolves.toBe(true)
    expect(client.loadExistingRunModelOptions).not.toHaveBeenCalled()
  })
})

describe('existingRunModelOptionsActions.refreshModelOptions (the first read of an edit)', () => {
  it('shows a scope the server could not read as unavailable with its message', async () => {
    const store = host({ kind: 'team', teamRunId: 'team', planner: { scopesByAddress: { '/': {} } } })
    client.loadExistingRunModelOptions.mockResolvedValueOnce({ '/': unreadable })
    await store.refreshModelOptions()
    expect(store.modelOptionsByAddress['/']).toEqual(unreadable)
  })

  it('shows every scope as loading until the answer arrives', async () => {
    const store = host({ kind: 'agent', runId: 'run' })
    let answer!: (value: unknown) => void
    client.loadExistingRunModelOptions.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))

    const refreshing = store.refreshModelOptions()
    expect(store.modelOptionsByAddress).toEqual({ '/': { status: 'loading', options: null } })

    answer({ '/': ready(['fable']) })
    await refreshing
    expect(store.modelOptionsByAddress['/']).toEqual(ready(['fable']))
  })
})
