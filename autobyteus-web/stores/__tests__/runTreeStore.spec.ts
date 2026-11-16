import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'

/**
 * autobyteus-461 SR-084, AR-028: the window's run trees. A run's open view feeds its tree; a listed run reads `runTree`
 * when first shown and again on `RUN_TREE_CHANGED`, and only the newest answer applies.
 */
const query = vi.fn()
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }))
const binding = reactive({ bindingRevision: 1 })
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => binding }))
const status = reactive({ treeRevision: {} as Record<string, number> })
const hold = vi.fn((_refs: unknown) => () => undefined)
vi.mock('~/stores/runStatusStore', () => ({ useRunStatusStore: () => ({
  hold, treeRevisionOf: (ref: { kind: string; runId: string }) => status.treeRevision[`${ref.kind}:${ref.runId}`] ?? 0 }) }))

import { useRunTreeStore } from '../runTreeStore'

const row = (key: string, parentKey: string | null, depth: number, target: RunTreeRowDto['openTarget'] = null): RunTreeRowDto => ({
  key, parentKey, depth, kind: 'agent', name: key, address: `/${key}`, openTarget: target, statusIds: [key] })
const manager = { kind: 'agent' as const, runId: 'manager' }
const answer = (rows: RunTreeRowDto[]) => ({ data: { runTree: { kind: 'agent', runId: 'manager', rows } } })
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r }); return { promise, resolve } }
const settle = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve() }

describe('runTreeStore (SR-084)', () => {
  beforeEach(() => { setActivePinia(createPinia()); query.mockReset(); hold.mockClear(); status.treeRevision = {} })

  it('a listed run: read when first shown; its rows\' runs are held for their statuses; read again on its notice', async () => {
    const store = useRunTreeStore()
    query.mockResolvedValueOnce(answer([row('agent:manager', null, 0), row('agent:writer', 'agent:manager', 1, { runKind: 'agent', runId: 'writer', agentRunId: 'writer' })]))
    store.hold(manager)
    await settle()
    expect(store.rowsOf(manager).map((r) => r.key)).toEqual(['agent:manager', 'agent:writer'])
    await nextTick()
    expect(hold).toHaveBeenLastCalledWith([{ kind: 'agent', runId: 'manager' }, { kind: 'agent', runId: 'writer' }])
    query.mockResolvedValueOnce(answer([row('agent:manager', null, 0)]))
    status.treeRevision = { 'agent:manager': 1 }
    await nextTick()
    await settle()
    expect(store.rowsOf(manager).map((r) => r.key)).toEqual(['agent:manager'])
  })

  it('only the newest answer applies: an older read that answers last is dropped', async () => {
    const store = useRunTreeStore()
    const first = deferred<unknown>()
    const second = deferred<unknown>()
    query.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    void store.read(manager)
    void store.read(manager)
    second.resolve(answer([row('agent:manager', null, 0), row('agent:new', 'agent:manager', 1)]))
    await settle()
    first.resolve(answer([row('agent:manager', null, 0)]))
    await settle()
    expect(store.rowsOf(manager).map((r) => r.key)).toEqual(['agent:manager', 'agent:new'])
  })

  it('an open view feeds the tree: its snapshot supersedes a read in flight, its changes apply in order; no read while it feeds', async () => {
    const store = useRunTreeStore()
    const late = deferred<unknown>()
    query.mockReturnValueOnce(late.promise)
    void store.read(manager)
    store.streamSnapshot(manager, [row('agent:manager', null, 0)])
    late.resolve(answer([]))
    await settle()
    store.streamChange(manager, { added: [row('agent:helper', 'agent:writer', 2), row('agent:writer', 'agent:manager', 1)], removed: [], updated: [] })
    expect(store.rowsOf(manager).map((r) => r.key)).toEqual(['agent:manager', 'agent:writer', 'agent:helper'])
    store.streamChange(manager, { added: [], removed: ['agent:helper'], updated: [{ ...row('agent:writer', 'agent:manager', 1), name: 'lead writer' }] })
    expect(store.rowsOf(manager).map((r) => r.name)).toEqual(['agent:manager', 'lead writer'])
    await store.read(manager)
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('a change before any snapshot is refused (the view reopens); a closed view\'s tree stays, and its next notice reads it again', async () => {
    const store = useRunTreeStore()
    expect(() => store.streamChange(manager, { added: [], removed: [], updated: [] })).toThrow(/before its tree snapshot/)
    store.streamSnapshot(manager, [row('agent:manager', null, 0)])
    query.mockResolvedValue(answer([row('agent:manager', null, 0), row('agent:writer', 'agent:manager', 1)]))
    store.hold(manager)
    expect(query).not.toHaveBeenCalled()
    store.streamEnded(manager)
    await settle()
    // Nothing is read at the close itself.
    expect(query).not.toHaveBeenCalled()
    expect(store.rowsOf(manager).map((r) => r.key)).toEqual(['agent:manager'])
    status.treeRevision = { 'agent:manager': 1 }
    await nextTick()
    await settle()
    expect(store.rowsOf(manager).map((r) => r.key)).toEqual(['agent:manager', 'agent:writer'])
  })

  it("CR-461-099: an agent of a peer's run is its tree row's: its run, node and answer; a run of this node has none", () => {
    const store = useRunTreeStore()
    const peer = { nodeId: 'node-b', nodeName: 'Node B', title: 'Studio', reachable: false }
    store.streamSnapshot(manager, [row('agent:manager', null, 0, { runKind: 'agent', runId: 'manager', agentRunId: 'manager' }),
      { ...row('peer_team:studio', 'agent:manager', 1, { runKind: 'agent_team', runId: 'studio', agentRunId: 'lead', nodeId: 'node-b' }), kind: 'peer_team', peer },
      { ...row('peer_member:studio:mate', 'peer_team:studio', 2, { runKind: 'agent_team', runId: 'studio', agentRunId: 'mate', nodeId: 'node-b' }), kind: 'peer_member', peer }])
    expect(store.peerRunOf('mate')).toEqual({ runId: 'studio', nodeId: 'node-b', nodeName: 'Node B', reachable: false, title: 'Studio' })
    expect(store.peerRunOf('lead')).toMatchObject({ runId: 'studio', nodeName: 'Node B' })
    expect(store.peerRunOf('manager')).toBeNull()
    expect(store.peerRunOf(null)).toBeNull()
  })
})
