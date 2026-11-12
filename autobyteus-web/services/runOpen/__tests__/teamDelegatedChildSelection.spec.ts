import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import { createPinia, setActivePinia } from 'pinia'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useActiveContextStore } from '~/stores/activeContextStore'

/**
 * autobyteus-461 CR-461-010 (SCN-005 / AC-007, design DS-8): in a stopped Team's open view, a row of a run the Team
 * delegated to is selected as that run, by its own identity (its stored state from its own run, never as a member of
 * the Team), and the composer sends to it on the Team's stream; the Team stays stopped.
 */
const io = vi.hoisted(() => ({ query: vi.fn(), ws: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query, mutate: vi.fn() }) }))
vi.mock('~/services/agentStreaming/transport', async (original) => ({ ...await original<any>(), WebSocketClient: class { constructor() { return io.ws } } }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ teamWs: 'ws://fixture.invalid/team' }), bindingRevision: 1 }) }))
vi.mock('vue-router', async (original) => ({ ...await original<any>(), useRoute: () => ({ query: {} }) }))

const ROOT = 'stopped-team', CHILD = 'worker-child-run'
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
afterEach(() => { useAgentTeamRunStore().disconnectTeamStream(ROOT); vi.restoreAllMocks() })

const openStoppedTeamWithChild = () => {
  const callbacks = new Map<string, (value?: any) => void>()
  io.ws = { state: 'connected', connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
    on: vi.fn((name, fn) => callbacks.set(name, fn)), off: vi.fn() }
  const raw = buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/manager', focusedAgentRunId: 'manager-run', isActive: false,
    rootChildren: [testAgentNode('/manager', { agentRunId: 'manager-run' }), testAgentNode('/worker', { agentRunId: 'worker-run' })] })
  useAgentTeamContextsStore().teams = new Map([[ROOT, raw]])
  const team = useAgentTeamContextsStore().getTeamContextById(ROOT)!
  useAgentSelectionStore().selectRun(ROOT, 'team')
  const stream = useAgentTeamRunStore().connectToTeamStream(ROOT)!
  const emit = (type: string, payload: any) => { const wire = JSON.stringify({ type, payload }); parseTeamStreamServerMessage(wire); callbacks.get('onMessage')!(wire) }
  // The stopped Team's view: its stored-mode snapshot and lifecycle (SR-046).
  emit('CONNECTED', { session_id: 'session', root_team_run_id: ROOT })
  emit('TEAM_EXECUTION_VIEW_SNAPSHOT', { root_team_run_id: ROOT, base_change_sequence: 0, live_sequence_id: 'stored-1', last_message_change_sequence: 0,
    execution_tree: team.view.getExecutionTree(), agent_input_states: [], remote_task_executions: [],
    agent_statuses: team.view.listAgentContextEntries().map((e) => ({ agent_run_id: e.agentRunId, member_address: e.memberAddress, status: 'offline',
      trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null })) })
  emit('TEAM_RUN_LIFECYCLE', { is_active: false })
  // The Manager delegated to a run of its own, which is working (its row comes on the view's stream).
  const worker = team.view.getExecutionTree().root_team.members.find((member) => member.address === '/worker')!
  emit('CHILD_RUNS_CHANGED', { run_id: ROOT, removed: [], added: [{ parent_team_run_id: ROOT,
    execution: { kind: 'task_agent', address: '/worker', agent_run_id: CHILD, platform_agent_run_id: null, delegator_agent_run_id: 'manager-run',
      started_at: '2026-11-12T00:00:00Z', source: { kind: 'agent', agent_definition_id: worker.agent_definition_id,
        launch_configuration: worker.launch_configuration, launch_source: { origin: 'configured', fallbacks: [] } } } }] })
  expect(stream.isReady).toBe(true)
  return { team }
}

it("selects a delegated child's row in a stopped Team's view by the child's own identity, and the message goes to the child on the Team's stream", async () => {
  const { team } = openStoppedTeamWithChild()
  io.query.mockImplementation(async ({ query, variables }) => {
    const name = query.definitions[0].name.value
    if (name === 'GetRunProjection') return { data: { getRunProjection: { runId: variables.runId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    if (name === 'GetRunFileChanges') return { data: { getRunFileChanges: [] } }
    // Reading the child as a member of the Team is what the server refuses (CR-461-010); the Team's own members read.
    if (variables.agentRunId === CHILD) return { errors: [{ message: `AgentRun '${CHILD}' was not found in root TeamRun '${ROOT}'.` }] }
    if (name === 'GetTeamMemberRunProjection') return { data: { getTeamMemberRunProjection: { agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    return { data: { getTeamMemberFileChanges: [] } }
  })

  // The row's click: the store action the desktop list, the history tree and the phone call.
  await expect(useRunHistoryStore().selectTreeRun({ teamRunId: ROOT, memberAddress: '/worker', agentRunId: CHILD }))
    .resolves.toMatchObject({ disposition: 'committed' })

  expect(team.view.getFocusedAgentRunId()).toBe(CHILD)
  const reads = io.query.mock.calls.map(([options]) => [options.query.definitions[0].name.value, options.variables])
  expect(reads).toEqual(expect.arrayContaining([['GetRunProjection', { runId: CHILD }], ['GetRunFileChanges', { runId: CHILD }]]))
  expect(reads.some(([name, variables]) => name.startsWith('GetTeamMember') && (variables as { agentRunId?: string }).agentRunId === CHILD)).toBe(false)
  // Its pages and files are browsed by its own identity too.
  expect(useActiveContextStore().activeWorkspaceTarget).toMatchObject({ browse: { kind: 'run', runId: CHILD } })

  void useAgentTeamRunStore().sendMessageToFocusedMember('check the build', [])
  await vi.waitFor(() => expect(io.ws.send).toHaveBeenCalled())
  expect(JSON.parse(io.ws.send.mock.calls[0][0])).toMatchObject({ type: 'SEND_MESSAGE', payload: { agent_run_id: CHILD, content: 'check the build' } })
  // Nothing restored the Team: it stays stopped until its own stream says otherwise.
  expect(team.view.isRootTeamActive()).toBe(false)
})

it("text typed while a child row's stored state is still loading goes to the child, and the message reaches it (CR-461-019)", async () => {
  const { team } = openStoppedTeamWithChild()
  let releaseProjection!: () => void
  const projectionHeld = new Promise<void>((resolve) => { releaseProjection = resolve })
  io.query.mockImplementation(async ({ query, variables }) => {
    const name = query.definitions[0].name.value
    if (name === 'GetRunProjection') {
      await projectionHeld
      return { data: { getRunProjection: { runId: variables.runId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    }
    if (name === 'GetRunFileChanges') return { data: { getRunFileChanges: [] } }
    if (name === 'GetTeamMemberRunProjection') return { data: { getTeamMemberRunProjection: { agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    return { data: { getTeamMemberFileChanges: [] } }
  })

  // The user clicks the child's row and types while its stored state is still loading, as the composer does: into the
  // context of the agent the composer shows.
  const selecting = useRunHistoryStore().selectTreeRun({ teamRunId: ROOT, memberAddress: '/worker', agentRunId: CHILD })
  await vi.waitFor(() => expect(io.query.mock.calls.some(([options]) => options.query.definitions[0].name.value === 'GetRunProjection')).toBe(true))
  const shown = useActiveContextStore().activeWorkspaceTarget!
  shown.context.requirement = 'check the build'
  expect(shown.context.state.runId).toBe(CHILD)

  releaseProjection()
  await expect(selecting).resolves.toMatchObject({ disposition: 'committed' })
  void useActiveContextStore().send()
  await vi.waitFor(() => expect(io.ws.send).toHaveBeenCalled())
  expect(JSON.parse(io.ws.send.mock.calls[0][0])).toMatchObject({ type: 'SEND_MESSAGE', payload: { agent_run_id: CHILD, content: 'check the build' } })
  expect(team.view.getAgentContext('manager-run')!.requirement).toBe('')
  expect(team.view.isRootTeamActive()).toBe(false)
})
