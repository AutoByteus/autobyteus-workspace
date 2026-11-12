import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GetAgentRunCollaboration, GetAgentRunCollaborationMemberProjection } from '~/graphql/queries/collaboratorQueries'
import { GetRunFileChanges } from '~/graphql/queries/runHistoryQueries'
import { memberId, multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'

const io = vi.hoisted(() => ({ query: vi.fn(), holds: [] as Array<{ match(input: any): boolean; remaining: number; promise: Promise<void> }> }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyRunNavigationEffect: vi.fn(), ensureWorkspaceByRootPath: vi.fn(async () => null),
  resolveWorkspaceMetadataByRootPath: vi.fn(async () => null),
}) }))
vi.mock('~/stores/delegatedRunsStore', async () => ({ useDelegatedRunsStore: (await import('~/test-support/delegatedRunsFake')).fakeDelegatedRunsStore }))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { ownRuns } from '~/test-support/delegatedRunsFake'

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
let view = multiTeamView()
const serve = () => io.query.mockImplementation(async (input) => {
  const hold = io.holds.find((entry) => entry.remaining > 0 && entry.match(input))
  if (hold) { hold.remaining -= 1; await hold.promise }
  if (input.query === GetAgentRunCollaboration) {
    return { data: { agentRunCollaboration: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view } } }
  }
  if (input.query === GetAgentRunCollaborationMemberProjection) {
    return { data: { agentRunCollaborationMemberProjection: {
      agentRunId: input.variables.agentRunId, memberAddress: input.variables.memberAddress,
      conversation: [{ kind: 'message', role: 'assistant', content: `stored ${input.variables.agentRunId}`, ts: 1_700_000_000 }],
      activities: [], hasEarlierActiveTraceEvents: false,
    } } }
  }
  throw new Error('Unexpected query')
})
const count = (query: unknown, agentRunId?: string) => io.query.mock.calls
  .filter(([input]) => input.query === query && (!agentRunId || input.variables.agentRunId === agentRunId)).length
const memberRequests = () => count(GetAgentRunCollaborationMemberProjection)
describe('Agent-root children load on demand', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); Socket.instances.length = 0; io.holds.length = 0; ownRuns.reset()
    vi.stubGlobal('WebSocket', Socket)
    view = multiTeamView()
    serve()
  })
  afterEach(() => { useAgentRunCollaborationStore().release('host-run') })

  it.each([5, 50])('drawing the rows of a hub with %s task Teams issues one view request and no member request (AC-001, AC-002)', async (teams) => {
    view = multiTeamView(teams)
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')

    expect(store.taskRows('host-run')).toHaveLength(teams)
    expect(store.contextFor('host-run')!.listAgentContextEntries()).toHaveLength(teams * 6)
    expect(count(GetAgentRunCollaboration)).toBe(1)
    expect(memberRequests()).toBe(0)
    expect(count(GetRunFileChanges)).toBe(0)
    expect(io.query).toHaveBeenCalledTimes(1)
  })

  it('rule 2: selecting a child opens it as its own run; the host loads nothing for it (autobyteus-461)', async () => {
    const store = useAgentRunCollaborationStore(); await store.inspect('host-run')
    const child = memberId(2, 4)
    store.selectChild('host-run', child); await flush()
    store.selectChild('host-run', child); await flush()
    expect(ownRuns.ensureOpen).toHaveBeenCalledTimes(2)
    expect(ownRuns.ensureOpen).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'team_member', agentRunId: child }))
    expect(memberRequests()).toBe(0)
    expect(count(GetRunFileChanges)).toBe(0)
  })
})
