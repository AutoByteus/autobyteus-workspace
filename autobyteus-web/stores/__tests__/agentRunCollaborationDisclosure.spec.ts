import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, multiTeamView, teamId } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'

const hydration = vi.hoisted(() => ({ read: vi.fn(), build: vi.fn(), hydrateChild: vi.fn(async () => 'hydrated') }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: hydration.read, buildAgentRunCollaborationContext: hydration.build,
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationChildHydration', () => ({
  hydrateAgentRunCollaborationChild: hydration.hydrateChild,
}))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(async () => null) }) }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'

class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void
  send = vi.fn(); close = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }
const snapshot = async (socket: Socket, view = multiTeamView()) => {
  socket.frame({ type: 'CONNECTED', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', session_id: 'session' } })
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view } })
  await flush()
}
const event = (socket: Socket, change_sequence: number, value: unknown) => socket.frame({
  type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence, event: value },
})
/** An unsequenced child-row change (autobyteus-461 SR-042). */
const childRuns = (socket: Socket, added: unknown[], removed: unknown[]) => socket.frame({ type: 'CHILD_RUNS_CHANGED', payload: {
  root_subject_kind: 'agent', root_run_id: 'host-run', event: { kind: 'child_runs_changed', run_id: 'host-run', added, removed } } })
const rowKeys = (store: ReturnType<typeof useAgentRunCollaborationStore>) => store.taskRows('host-run').map(item => item.row.rowKey)

/** REQ-001..004/006: real store, context and stream; only hydration/transport boundaries are fixtures. */
describe('standalone delegated Team disclosure', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); Socket.instances.length = 0
    vi.stubGlobal('WebSocket', Socket)
    hydration.read.mockImplementation(async (host: string) => multiTeamView(7, host))
    hydration.build.mockImplementation(async ({ view }) => shallowReactive(buildMultiTeamContext(view)))
  })

  it('a fresh stored manager lists seven collapsed Teams, with all 42 child contexts intact', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    expect(rowKeys(store)).toEqual(Array.from({ length: 7 }, (_, index) => `team:${teamId(index)}`))
    expect(store.contextFor('host-run')!.listAgentContextEntries()).toHaveLength(42)
    expect(Socket.instances).toHaveLength(0)
    expect(store.selectedChild('host-run')).toBeNull()
  })

  it('exact host/Team choices survive stored refresh/reselection and new copies do not open', async () => {
    const store = useAgentRunCollaborationStore(); await store.inspect('host-run'); await store.inspect('other-host')
    store.toggleTaskTeam('host-run', teamId(2)); store.selectChild('host-run', memberId(2, 4))
    expect(store.childTargetFor('host-run')).toMatchObject({ agentRunId: memberId(2, 4), address: '/software_engineering_team/api_e2e_engineer' })
    expect(store.isTaskTeamExpanded('other-host', teamId(2))).toBe(false)
    const view = structuredClone(store.contextFor('host-run')!.view)
    const child = store.contextFor('host-run')!.getAgentContext(memberId(2, 4))!
    store.toggleTaskTeam('host-run', teamId(2))
    expect(store.contextFor('host-run')!.view).toEqual(view)
    expect(store.contextFor('host-run')!.getAgentContext(memberId(2, 4))).toBe(child)
    expect(store.selectedChild('host-run')).toBe(memberId(2, 4))
    store.toggleTaskTeam('host-run', teamId(3))
    store.selectChild('host-run', null)
    hydration.read.mockResolvedValue(multiTeamView(8))
    await store.inspect('host-run')
    expect(store.isTaskTeamExpanded('host-run', teamId(3))).toBe(true)
    expect(store.isTaskTeamExpanded('host-run', teamId(2))).toBe(false)
    expect(store.isTaskTeamExpanded('host-run', teamId(7))).toBe(false)
    expect(rowKeys(store)).toHaveLength(14) // eight teams + only the six members explicitly revealed
    expect(Socket.instances).toHaveLength(0)
  })

  it('a fresh frontend store after restart has no earlier manual choices', async () => {
    const store = useAgentRunCollaborationStore(); await store.inspect('host-run')
    store.toggleTaskTeam('host-run', teamId(1))
    store.release('host-run')
    await store.inspect('host-run')
    expect(rowKeys(store)).toHaveLength(7)
    store.toggleTaskTeam('host-run', teamId(1))
    setActivePinia(createPinia())
    const restarted = useAgentRunCollaborationStore(); await restarted.inspect('host-run')
    expect(rowKeys(restarted)).toHaveLength(7)
  })

  it('live snapshot, a started delegated run and reconnect preserve disclosure without losing event/selection behavior', async () => {
    const store = useAgentRunCollaborationStore(); store.syncHost('host-run', true)
    const socket = Socket.instances[0]!
    await snapshot(socket)
    expect(rowKeys(store)).toHaveLength(7)
    store.toggleTaskTeam('host-run', teamId(2)); store.selectChild('host-run', memberId(2, 0))
    expect(store.isTaskTeamExpanded('host-run', teamId(2))).toBe(true)
    expect(store.selectedChild('host-run')).toBe(memberId(2, 0))
    // A new child row (autobyteus-461 SR-042, unsequenced) follows the production checkpoint/reconnect snapshot path.
    childRuns(socket, [multiTeamView(8).execution_tree.taskExecutions.at(-1)], []); await flush()
    expect(Socket.instances).toHaveLength(2)
    const refreshed = multiTeamView(8)
    refreshed.base_change_sequence = 5
    await snapshot(Socket.instances[1]!, refreshed)
    expect(store.isTaskTeamExpanded('host-run', teamId(2))).toBe(true)
    expect(store.isTaskTeamExpanded('host-run', teamId(7))).toBe(false)
    expect(store.isTaskTeamExpanded('host-run', 'team-run')).toBe(false)
    expect(rowKeys(store).length).toBeGreaterThanOrEqual(8)
    expect(store.selectedChild('host-run')).toBe(memberId(2, 0))
    // The child's Task closed: it leaves through a fresh view, and its selected member returns the focus to the run.
    childRuns(Socket.instances[1]!, [], [{ teamRunId: teamId(2) }]); await flush()
    expect(Socket.instances).toHaveLength(3)
    const closed = multiTeamView(8)
    closed.base_change_sequence = 5
    closed.execution_tree = { ...closed.execution_tree, taskExecutions: closed.execution_tree.taskExecutions.filter((task) => !('teamRunId' in task && task.teamRunId === teamId(2))) }
    await snapshot(Socket.instances[2]!, closed)
    expect(store.contextFor('host-run')!.phase).toBe('live')
    expect(store.selectedChild('host-run')).toBeNull()
    expect(rowKeys(store)).not.toContain(`team:${teamId(2)}`)
    store.release('host-run')
    expect(socket.send).not.toHaveBeenCalled()
    expect(Socket.instances[1]!.send).not.toHaveBeenCalled()
    expect(store.errors['host-run']).toBeUndefined()
  })
})

// autobyteus-277: the task rows' two rules live in the store, for the desktop rows and the phone's tree alike.
describe('task row rules', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); Socket.instances.length = 0
    vi.stubGlobal('WebSocket', Socket)
    hydration.read.mockImplementation(async (host: string) => multiTeamView(2, host))
    hydration.build.mockImplementation(async ({ view }) => shallowReactive(buildMultiTeamContext(view)))
  })

  // autobyteus-461 SR-055: the open run's rows select through its view; a row of a run that is not open comes from the
  // history poll's answer (agentRunListedTaskRows.spec).
  it('selectTaskRow on the open run: a task Team row selects its coordinator; with neither view nor answer, nothing', async () => {
    const store = useAgentRunCollaborationStore()
    const teamRow = { agentRunId: null, teamRunIdForNode: teamId(1) } as never
    expect(store.selectTaskRow('host-run', teamRow)).toBe(false)
    store.attach('host-run')
    await snapshot(Socket.instances[0]!, multiTeamView(2))
    expect(store.selectTaskRow('host-run', teamRow)).toBe(true)
    expect(store.selectedChild('host-run')).toBe(memberId(1, 0))
  })

  it('selectTaskRow on the open run: a task agent row selects that agent', async () => {
    const store = useAgentRunCollaborationStore()
    store.attach('host-run')
    await snapshot(Socket.instances[0]!, multiTeamView(2))
    expect(store.selectTaskRow('host-run', { agentRunId: memberId(0, 2), teamRunIdForNode: null } as never)).toBe(true)
    expect(store.selectedChild('host-run')).toBe(memberId(0, 2))
  })
})
