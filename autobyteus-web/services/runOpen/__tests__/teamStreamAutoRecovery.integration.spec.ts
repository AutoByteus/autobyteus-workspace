import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { startTeamStreamAutoRecovery, type TeamStreamAutoRecovery } from '~/services/runOpen/teamStreamAutoRecovery'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useTeamStreamRecoveryStore } from '~/stores/teamStreamRecoveryStore'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'

/**
 * autobyteus-541 A end to end in the page (AC-001's web spec, ARCH-REV-002 N-2): a real Team stream over a fake socket
 * loses an event; the recovery owner, the shared reopen and the store's verified replacement bring the view back with
 * no reselect. Each way a stream enters `reopen_required` is here once: a gap on an event, a gap on a content batch's
 * range, and a candidate that fails (an invalid snapshot, a socket that closes) before the one that recovers.
 */

type Listener = (...args: any[]) => void
const { sockets, teams, hydrateForRecovery } = vi.hoisted(() => ({
  sockets: [] as any[],
  teams: new Map<string, any>(),
  hydrateForRecovery: vi.fn(),
}))

vi.mock('~/services/agentStreaming/transport', async (importOriginal) => {
  const original = await importOriginal<typeof import('~/services/agentStreaming/transport')>()
  class FakeSocket {
    state = 'disconnected'
    url: string | null = null
    sent: string[] = []
    listeners = new Map<string, Listener>()
    constructor() { sockets.push(this) }
    connect(url: string) { this.url = url; this.state = 'connected'; this.listeners.get('onConnect')?.() }
    disconnect() { this.state = 'disconnected' }
    send(text: string) { this.sent.push(text) }
    on(event: string, listener: Listener) { this.listeners.set(event, listener) }
    off(event: string) { this.listeners.delete(event) }
  }
  return { ...original, WebSocketClient: FakeSocket }
})
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ teamWs: 'ws://node.example/ws/agent-team' }), bindingRevision: 1 }),
}))
vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({
    get activeTeamContext() { return teams.get('team-gap') ?? null },
    getTeamContextById: (id: string) => teams.get(id),
    replaceTeamContext: (id: string, expected: unknown, replacement: unknown) => {
      if (teams.get(id) !== expected) throw new Error('changed')
      teams.set(id, replacement)
    },
  }),
}))
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({
    refreshTreeQuietly: () => Promise.resolve(), applyRunNavigationEffect: () => undefined,
    refreshRunNavigationTopology: () => undefined, reconcileFocusedTeamMemberProjection: () => Promise.resolve(),
  }),
}))
vi.mock('~/stores/runTreeStore', () => ({
  useRunTreeStore: () => ({ streamEnded: () => undefined, streamSnapshot: () => undefined, streamChange: () => undefined, rowsOf: () => [] }),
}))
vi.mock('~/services/collaborationMessages/participantMessagesQuery', async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub)
vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => ({ finalizeDraftAttachments: async ({ attachments }: { attachments: unknown[] }) => attachments }),
}))
vi.mock('~/stores/runHistoryLoadActions', () => ({
  ensureRunHistoryWorkspaceByRootPath: vi.fn(),
  resolveRunHistoryWorkspaceMetadataByRootPath: vi.fn(),
}))
vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  hydrateLiveTeamRunContext: vi.fn(),
  hydrateTeamRunContextForStreamRecovery: hydrateForRecovery,
}))
vi.mock('~/services/runHydration/teamRunHydrationCommit', () => ({
  commitTeamRunHydration: vi.fn(),
  markCommittedTeamRunHydrationAuthority: vi.fn(),
}))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ mutate: vi.fn(), query: vi.fn() }) }))

const ROOT = 'team-gap'
const LEAD = 'lead-run'
const WORKER = 'worker-run'
const RECOVERED_BASE = 6

const team = (): AgentTeamContext => buildTestTeamContext({
  teamRunId: ROOT,
  coordinatorAddress: '/lead',
  rootChildren: [
    testAgentNode('/lead', { displayName: 'Lead', agentRunId: LEAD }),
    testAgentNode('/worker', { displayName: 'Worker', agentRunId: WORKER }),
  ],
  focusedAgentRunId: WORKER,
})

const frame = (socket: any, type: string, payload: Record<string, unknown>) =>
  socket.listeners.get('onMessage')?.(JSON.stringify({ type, payload }))
const status = (changeSequence: number, agentRunId: string, value: string) => ({
  change_sequence: changeSequence, agent_run_id: agentRunId, status: value, trigger: null, tool_name: null,
  error_message: null, error_details: null, background_tasks_running: 0, recoverableBlock: null,
})
const snapshot = (context: AgentTeamContext, base: number, statusOf: (agentRunId: string) => string) => ({
  root_team_run_id: ROOT, base_change_sequence: base, live_sequence_id: 'live-1', last_message_change_sequence: 0,
  execution_tree: context.view.getExecutionTree(), agent_input_states: [],
  agent_statuses: context.view.listAgentContextEntries().map((entry) => ({
    ...status(0, entry.agentRunId, statusOf(entry.agentRunId)), member_address: entry.memberAddress,
  })).map(({ change_sequence: _ignored, ...rest }) => rest),
})
const ready = (socket: any, context: AgentTeamContext, base: number, statusOf = (_id: string) => 'idle') => {
  frame(socket, 'CONNECTED', { session_id: `session-${sockets.indexOf(socket)}`, root_team_run_id: ROOT })
  frame(socket, 'TEAM_EXECUTION_VIEW_SNAPSHOT', snapshot(context, base, statusOf))
}
const candidateRead = () => {
  const candidate = team()
  hydrateForRecovery.mockResolvedValueOnce({
    teamRunId: ROOT, focusedAgentRunId: WORKER, hydratedContext: candidate,
    resumeConfig: { teamRunId: ROOT, isActive: true }, projectionByAgentRunId: new Map([[WORKER, {}]]),
    memberRunStates: [], expectedBaseChangeSequence: RECOVERED_BASE,
  })
  return candidate
}
const settle = () => vi.advanceTimersByTimeAsync(0)

describe('a Team stream recovers by itself after a real gap (autobyteus-541 AC-001, N-2)', () => {
  let owner: TeamStreamAutoRecovery
  let live: AgentTeamContext

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    sockets.length = 0
    teams.clear()
    hydrateForRecovery.mockReset()
    owner = startTeamStreamAutoRecovery()
    live = team()
    teams.set(ROOT, live)
    useAgentTeamRunStore().connectToTeamStream(ROOT)
    ready(sockets[0], live, 0)
    expect(useAgentTeamRunStore().isTeamStreamReady(ROOT)).toBe(true)
  })
  afterEach(() => {
    useAgentTeamRunStore().disconnectAllTeamStreams()
    owner.dispose()
    vi.useRealTimers()
  })

  const expectRecovered = (candidate: AgentTeamContext) => {
    expect(teams.get(ROOT)).toBe(candidate)
    expect(useAgentTeamRunStore().isTeamStreamReady(ROOT)).toBe(true)
    expect(useAgentTeamRunStore().isTeamStreamReopenRequired(ROOT)).toBe(false)
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBeNull()
  }

  it('an event past a gap: the view recovers in one attempt, the members show the node\'s status, and a send goes', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    live.view.getAgentContext(WORKER)!.state.currentStatus = AgentStatus.Running
    const candidate = candidateRead()
    frame(sockets[0], 'AGENT_STATUS', status(2, LEAD, 'running'))
    expect(useAgentTeamRunStore().isTeamStreamReopenRequired(ROOT)).toBe(true)
    // The member keeps its last status while the stream recovers (REQ-002).
    expect(live.view.getAgentContext(WORKER)!.state.currentStatus).toBe(AgentStatus.Running)
    await settle()
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBe('recovering')
    expect(hydrateForRecovery).toHaveBeenCalledTimes(1)
    expect(sockets).toHaveLength(2)

    ready(sockets[1], candidate, RECOVERED_BASE, (id) => (id === WORKER ? 'idle' : 'running'))
    await settle()
    expectRecovered(candidate)
    expect(candidate.view.getAgentContext(WORKER)!.state.currentStatus).toBe(AgentStatus.Idle)
    expect(candidate.view.getAgentContext(LEAD)!.state.currentStatus).toBe(AgentStatus.Running)

    // A send right after goes on the recovered stream.
    void useAgentTeamRunStore().sendMessageToFocusedMember('after the gap', [])
    await vi.advanceTimersByTimeAsync(100)
    expect(sockets[1].sent.map((text: string) => JSON.parse(text).type)).toContain('SEND_MESSAGE')
  })

  it('a content batch whose range does not continue the view starts the same recovery', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const candidate = candidateRead()
    frame(sockets[0], 'SEGMENT_CONTENT_BATCH', { change_sequence: 3, change_sequence_through: 4, items: [
      { agent_run_id: LEAD, segment_id: 'seg-1', turn_id: 'turn-1', segment_type: 'text', occurred_at: '2026-11-27T00:00:00.000Z', delta: 'x' },
    ] })
    await settle()
    expect(hydrateForRecovery).toHaveBeenCalledTimes(1)
    ready(sockets[1], candidate, RECOVERED_BASE)
    await settle()
    expectRecovered(candidate)
  })

  it('a candidate with an invalid snapshot fails that attempt; the next one recovers', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    candidateRead()
    frame(sockets[0], 'AGENT_STATUS', status(2, LEAD, 'running'))
    await settle()
    // Its snapshot is not at the base the read verified: the candidate is refused and closed.
    ready(sockets[1], teams.get(ROOT), RECOVERED_BASE + 1)
    await settle()
    expect(teams.get(ROOT)).toBe(live)
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBe('recovering')

    const candidate = candidateRead()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(hydrateForRecovery).toHaveBeenCalledTimes(2)
    ready(sockets[2], candidate, RECOVERED_BASE)
    await settle()
    expectRecovered(candidate)
  })

  it('a candidate whose socket closes before its snapshot fails that attempt; the next one recovers', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    candidateRead()
    frame(sockets[0], 'AGENT_STATUS', status(2, LEAD, 'running'))
    await settle()
    sockets[1].listeners.get('onDisconnect')?.('closed by the node', true)
    await settle()
    expect(teams.get(ROOT)).toBe(live)

    const candidate = candidateRead()
    await vi.advanceTimersByTimeAsync(1_000)
    ready(sockets[2], candidate, RECOVERED_BASE)
    await settle()
    expectRecovered(candidate)
  })
})
