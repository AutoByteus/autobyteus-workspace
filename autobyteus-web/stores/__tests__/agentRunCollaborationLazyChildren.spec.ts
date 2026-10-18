import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  GetAgentRunCollaboration,
  GetAgentRunCollaborationMemberFileChanges,
  GetAgentRunCollaborationMemberProjection,
} from '~/graphql/queries/collaboratorQueries'
import { GetRunFileChanges } from '~/graphql/queries/runHistoryQueries'
import { memberId, multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'

const io = vi.hoisted(() => ({ query: vi.fn(), refreshTopology: vi.fn(), holds: [] as Array<{ match(input: any): boolean; remaining: number; promise: Promise<void> }> }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyRunNavigationEffect: vi.fn(), ensureWorkspaceByRootPath: vi.fn(async () => null),
  resolveWorkspaceMetadataByRootPath: vi.fn(async () => null), refreshRunNavigationTopology: io.refreshTopology,
}) }))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'

/**
 * delegated-copies-slow-open (AC-001, AC-002, AC-004, AC-006, AC-007; D-1, D-2, D-4, D-5): the real
 * store, context, builder, child hydration and stream; only GraphQL and the socket are fixtures.
 */
class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void
  send = vi.fn(); close = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => { resolve = yes })
  return { promise, resolve }
}
let view = multiTeamView()
const serve = () => io.query.mockImplementation(async (input) => {
  const hold = io.holds.find((entry) => entry.remaining > 0 && entry.match(input))
  if (hold) { hold.remaining -= 1; await hold.promise }
  if (input.query === GetAgentRunCollaboration) {
    return { data: { agentRunCollaboration: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view } } }
  }
  if (input.query === GetAgentRunCollaborationMemberFileChanges) return { data: { agentRunCollaborationMemberFileChanges: [] } }
  if (input.query === GetAgentRunCollaborationMemberProjection) {
    return { data: { agentRunCollaborationMemberProjection: {
      agentRunId: input.variables.agentRunId, memberAddress: input.variables.memberAddress,
      conversation: [{ kind: 'message', role: 'assistant', content: `stored ${input.variables.agentRunId}`, ts: 1_700_000_000 }],
      activities: [], hasEarlierActiveTraceEvents: false,
    } } }
  }
  throw new Error('Unexpected query')
})
/** Holds the next load of one child (its projection and artifact requests) until released. */
const holdChild = (agentRunId: string) => {
  const gate = deferred()
  io.holds.push({ match: (input: any) => input.variables?.agentRunId === agentRunId, remaining: 2, promise: gate.promise })
  return () => gate.resolve()
}
const count = (query: unknown, agentRunId?: string) => io.query.mock.calls
  .filter(([input]) => input.query === query && (!agentRunId || input.variables.agentRunId === agentRunId)).length
const memberRequests = () => count(GetAgentRunCollaborationMemberProjection) + count(GetAgentRunCollaborationMemberFileChanges)
const snapshot = async (socket: Socket, snapshotView = multiTeamView()) => {
  socket.frame({ type: 'CONNECTED', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', session_id: 'session' } })
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: snapshotView } })
  await flush()
}
const startedExecution = (socket: Socket, change_sequence: number) => socket.frame({
  type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence, event: {
    kind: 'task_execution_started', host_kind: 'root', host_run_id: 'host-run', execution: multiTeamView(8).execution_tree.taskExecutions.at(-1),
  } },
})
const segment = { segment_id: 'segment-1', turn_id: 'turn-1', segment_type: 'text' as const }
const memberAddress = (copy: number, member: number) =>
  `/software_engineering_team/${['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'delivery_engineer'][member]}`
/** Live output of one copy: a segment start, then a content batch covering two sequences (autobyteus-139). */
const liveOutput = (socket: Socket, first: number, copy: number, member: number) => {
  const identity = { agent_run_id: memberId(copy, member), member_address: memberAddress(copy, member) }
  socket.frame({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence: first,
    event: { kind: 'agent_presentation', ...identity, message: { type: 'SEGMENT_START', payload: { ...segment, metadata: null } } } } })
  socket.frame({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run',
    change_sequence: first + 1, change_sequence_through: first + 2, event: { kind: 'agent_presentation_batch', items: [
      { ...identity, message: { type: 'SEGMENT_CONTENT', payload: { ...segment, delta: 'live ' } } },
      { ...identity, message: { type: 'SEGMENT_CONTENT', payload: { ...segment, delta: 'output' } } },
    ] } } })
}
const shown = (store: ReturnType<typeof useAgentRunCollaborationStore>, agentRunId: string) =>
  store.contextFor('host-run')!.getAgentContext(agentRunId)!.state.conversation.messages.length

describe('Agent-root children load on demand', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); Socket.instances.length = 0; io.holds.length = 0
    vi.stubGlobal('WebSocket', Socket)
    view = multiTeamView()
    serve()
  })
  afterEach(() => { useAgentRunCollaborationStore().release('host-run') })

  it.each([5, 50])('drawing the rows of a hub with %s task Teams issues one view request and no member request (AC-001, AC-002)', async (teams) => {
    view = multiTeamView(teams)
    const store = useAgentRunCollaborationStore()
    store.syncHost('host-run', false); await store.inspect('host-run')

    expect(store.taskRows('host-run')).toHaveLength(teams)
    expect(store.contextFor('host-run')!.listAgentContextEntries()).toHaveLength(teams * 6)
    expect(count(GetAgentRunCollaboration)).toBe(1)
    expect(memberRequests()).toBe(0)
    expect(count(GetRunFileChanges)).toBe(0)
    expect(io.query).toHaveBeenCalledTimes(1)
  })

  it('selecting a child loads it once; reselecting it in the same view does not refetch (AC-004)', async () => {
    const store = useAgentRunCollaborationStore(); await store.inspect('host-run')
    const child = memberId(2, 4)

    store.selectChild('host-run', child); await flush()
    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(1)
    expect(count(GetAgentRunCollaborationMemberFileChanges, child)).toBe(1)
    expect(shown(store, child)).toBe(1)
    store.selectChild('host-run', memberId(3, 0)); await flush()
    store.selectChild('host-run', null)
    store.selectChild('host-run', child); await flush()

    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(1)
    expect(memberRequests()).toBe(4)
    expect(count(GetRunFileChanges)).toBe(0)
  })

  it('a failed load is logged with the child identity, leaves it not loaded, and the next selection retries (AC-004)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const store = useAgentRunCollaborationStore(); await store.inspect('host-run')
    const child = memberId(1, 1)
    io.query.mockImplementationOnce(async () => ({ data: null, errors: [{ message: 'projection unavailable' }] }))

    store.selectChild('host-run', child); await flush()
    expect(warn).toHaveBeenCalledWith(`[agentRunCollaboration] Could not load '${child}' of 'host-run'.`, expect.any(Error))
    expect(store.contextFor('host-run')!.isChildHydrated(child)).toBe(false)
    expect(store.childTargetFor('host-run')).toMatchObject({ agentRunId: child })

    store.selectChild('host-run', null)
    store.selectChild('host-run', child); await flush()
    expect(store.contextFor('host-run')!.isChildHydrated(child)).toBe(true)
    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(2)
    warn.mockRestore()
  })

  it('republication by inspection during a load: the first load is superseded, the new context loads the child once (AR-001)', async () => {
    const store = useAgentRunCollaborationStore(); await store.inspect('host-run')
    const first = store.contextFor('host-run')!
    const child = memberId(4, 2)
    const releaseFirst = holdChild(child)

    store.selectChild('host-run', child); await flush()
    // The same (context, child) while its load is in flight starts nothing.
    store.selectChild('host-run', child); await flush()
    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(1)
    const releaseSecond = holdChild(child)
    store.syncHost('host-run', false); await flush()
    const second = store.contextFor('host-run')!
    expect(second).not.toBe(first)
    expect(second.getAgentContext(child)).toBe(first.getAgentContext(child))
    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(2)
    store.selectChild('host-run', child); await flush()

    releaseFirst(); await flush()
    expect(first.isChildHydrated(child)).toBe(false)
    expect(second.isChildHydrated(child)).toBe(false)
    expect(shown(store, child)).toBe(0)
    releaseSecond(); await flush()

    expect(second.isChildHydrated(child)).toBe(true)
    expect(shown(store, child)).toBe(1)
    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(2)
    expect(count(GetAgentRunCollaborationMemberFileChanges, child)).toBe(2)
    expect(memberRequests()).toBe(4)
  })

  it('a new delegation on a live hub with one opened child refreshes exactly that child, and the stream snapshot supersedes its in-flight load (AC-007, AR-001)', async () => {
    const store = useAgentRunCollaborationStore(); store.syncHost('host-run', true)
    await snapshot(Socket.instances[0]!)
    const opened = memberId(2, 0)
    store.selectChild('host-run', opened); await flush()
    expect(store.contextFor('host-run')!.isChildHydrated(opened)).toBe(true)
    const before = { projection: count(GetAgentRunCollaborationMemberProjection), files: count(GetAgentRunCollaborationMemberFileChanges) }
    const first = store.contextFor('host-run')!

    startedExecution(Socket.instances[0]!, 5); await flush()
    expect(Socket.instances).toHaveLength(2)
    const refreshed = multiTeamView(8); refreshed.base_change_sequence = 5
    const release = holdChild(opened)
    await snapshot(Socket.instances[1]!, refreshed)
    // The opened child keeps its shown conversation while the new context loads it again.
    expect(store.contextFor('host-run')).not.toBe(first)
    expect(store.taskRows('host-run')).toHaveLength(8)
    expect(shown(store, opened)).toBe(1)
    release(); await flush()

    expect(store.contextFor('host-run')!.isChildHydrated(opened)).toBe(true)
    expect(count(GetAgentRunCollaborationMemberProjection) - before.projection).toBe(1)
    expect(count(GetAgentRunCollaborationMemberFileChanges) - before.files).toBe(1)
    expect(count(GetAgentRunCollaborationMemberProjection, opened)).toBe(2)
    expect(count(GetAgentRunCollaboration)).toBe(0)
    // The base's task_execution_started handling (SR-009) ran without error on the same frame.
    expect(io.refreshTopology).toHaveBeenCalledWith('task-execution-started')
  })

  it('batched live output during an opened copy\'s load retries the load, which then commits (AC-006, autobyteus-139)', async () => {
    const store = useAgentRunCollaborationStore(); store.syncHost('host-run', true)
    await snapshot(Socket.instances[0]!)
    const child = memberId(3, 1)
    const release = holdChild(child)
    store.selectChild('host-run', child); await flush()

    liveOutput(Socket.instances[0]!, 5, 3, 1); await flush()
    expect(store.contextFor('host-run')!.phase).toBe('live')
    release(); await flush()

    expect(store.contextFor('host-run')!.isChildHydrated(child)).toBe(true)
    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(2)
    expect(count(GetAgentRunCollaborationMemberFileChanges, child)).toBe(2)
    expect(store.contextFor('host-run')!.changeSequence).toBe(7)
  })

  it('batched live output of an unopened copy loads nothing; opening it loads its stored conversation (AC-006, AC-007)', async () => {
    const store = useAgentRunCollaborationStore(); store.syncHost('host-run', true)
    await snapshot(Socket.instances[0]!)
    const child = memberId(6, 2)

    liveOutput(Socket.instances[0]!, 5, 6, 2); await flush()
    expect(memberRequests()).toBe(0)
    expect(shown(store, child)).toBe(1)
    store.selectChild('host-run', child); await flush()

    expect(store.contextFor('host-run')!.isChildHydrated(child)).toBe(true)
    expect(store.contextFor('host-run')!.getAgentContext(child)!.state.conversation.messages)
      .toMatchObject([{ type: 'ai', segments: [expect.objectContaining({ content: `stored ${child}` })] }])
    expect(memberRequests()).toBe(2)
  })

  it('a stream snapshot while the selected child is still loading supersedes that load; only the new context commits', async () => {
    const store = useAgentRunCollaborationStore(); store.syncHost('host-run', true)
    await snapshot(Socket.instances[0]!)
    const first = store.contextFor('host-run')!
    const child = memberId(5, 3)
    const releaseFirst = holdChild(child)
    store.selectChild('host-run', child); await flush()

    startedExecution(Socket.instances[0]!, 5); await flush()
    const refreshed = multiTeamView(8); refreshed.base_change_sequence = 5
    await snapshot(Socket.instances[1]!, refreshed)
    const second = store.contextFor('host-run')!
    expect(second).not.toBe(first)
    await flush()
    expect(second.isChildHydrated(child)).toBe(true)

    const shownBefore = store.contextFor('host-run')!.getAgentContext(child)!.state.conversation
    releaseFirst(); await flush()
    expect(first.isChildHydrated(child)).toBe(false)
    expect(store.contextFor('host-run')!.getAgentContext(child)!.state.conversation).toBe(shownBefore)
    expect(count(GetAgentRunCollaborationMemberProjection, child)).toBe(2)
    expect(count(GetAgentRunCollaborationMemberFileChanges, child)).toBe(2)
  })
})
