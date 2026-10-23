import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GetAgentRunCollaboration, GetAgentRunCollaborationMemberProjection } from '~/graphql/queries/collaboratorQueries'
import { multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'

const io = vi.hoisted(() => ({ query: vi.fn(), unreachable: false }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyRunNavigationEffect: vi.fn(), ensureWorkspaceByRootPath: vi.fn(async () => null),
  resolveWorkspaceMetadataByRootPath: vi.fn(async () => null),
}) }))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { useRemoteRunsStore } from '../remoteRunsStore'

/**
 * autobyteus-278 UIS-005: Retry on a remote run whose conversation its node did not give asks the node again for
 * the run's summary (on the live root's stream) and reads the conversation again; the notice then clears and the
 * conversation shows. Without a stream, Retry reads the run's agent; 'Checking' always ends. The real store, context, child hydration and stream; only GraphQL and the socket are fixtures.
 */
class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void
  send = vi.fn(); close = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
const remoteAgent = {
  kind: 'agent' as const, address: '/publisher', agent_run_id: 'publisher-run', node_id: 'srv_docker', node_name: 'docker',
  delegator_agent_run_id: 'host-run', started_at: '2999-01-01T00:00:00.000Z',
}
const remoteView = () => ({ ...multiTeamView(1), remote_task_executions: [remoteAgent] })

describe('Retry on an opened remote run', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); Socket.instances.length = 0; io.unreachable = true
    vi.stubGlobal('WebSocket', Socket)
    io.query.mockImplementation(async (input) => {
      if (input.query === GetAgentRunCollaboration) {
        return { data: { agentRunCollaboration: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: remoteView() } } }
      }
      if (input.query !== GetAgentRunCollaborationMemberProjection) throw new Error('Unexpected query')
      if (io.unreachable) return { data: null, errors: [{ message: 'REMOTE_PEER_UNREACHABLE' }] }
      return { data: { agentRunCollaborationMemberProjection: {
        agentRunId: input.variables.agentRunId, memberAddress: input.variables.memberAddress,
        conversation: [{ kind: 'message', role: 'assistant', content: 'OK', ts: 1_700_000_000 }], activities: [], hasEarlierActiveTraceEvents: false,
      } } }
    })
  })
  afterEach(() => { useAgentRunCollaborationStore().release('host-run') })

  it('asks the node again on the stream and reads the conversation again; the view then shows it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const store = useAgentRunCollaborationStore(); store.syncHost('host-run', true)
    const socket = Socket.instances[0]!
    socket.frame({ type: 'CONNECTED', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', session_id: 'session' } })
    socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: remoteView() } })
    await flush()
    const remoteRuns = useRemoteRunsStore()

    store.selectChild('host-run', 'publisher-run'); await flush()
    expect(remoteRuns.run('publisher-run')?.reachable).toBe(false)
    expect(store.contextFor('host-run')!.isChildHydrated('publisher-run')).toBe(false)

    io.unreachable = false
    remoteRuns.retry('publisher-run'); await flush()
    const refresh = socket.send.mock.calls.map(([raw]) => JSON.parse(raw)).filter((message) => message.type === 'REFRESH_REMOTE_TASK_EXECUTIONS')
    expect(refresh).toHaveLength(1)
    expect(remoteRuns.run('publisher-run')?.reachable).toBe(true)
    expect(store.contextFor('host-run')!.getAgentContext('publisher-run')!.state.conversation.messages).toHaveLength(1)
  })

  it("without a stream, Retry from the row reads the run's agent from its node, and its answer ends 'Checking'", async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const store = useAgentRunCollaborationStore(); await store.inspect('host-run')
    const remoteRuns = useRemoteRunsStore()
    remoteRuns.retry('publisher-run')
    expect(remoteRuns.run('publisher-run')?.checking).toBe(true)
    await flush()
    expect(remoteRuns.run('publisher-run')).toMatchObject({ reachable: false, checking: false })

    io.unreachable = false
    remoteRuns.retry('publisher-run'); await flush()
    expect(remoteRuns.run('publisher-run')).toMatchObject({ reachable: true, checking: false })
    expect(store.contextFor('host-run')!.isChildHydrated('publisher-run')).toBe(true)
    // Loaded and without a stream, there is nothing to ask: 'Checking' ends at once.
    remoteRuns.retry('publisher-run')
    expect(remoteRuns.run('publisher-run')?.checking).toBe(false)
  })
})
