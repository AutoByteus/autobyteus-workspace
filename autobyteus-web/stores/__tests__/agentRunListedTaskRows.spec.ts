import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import type { AgentRunCollaborationViewDto, RunCollaborationStatusesDto } from '@autobyteus/collaboration-stream-contracts'
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'
import { buildChildRunsContext } from '~/services/agentCollaboration/__tests__/agentRootChildRunsFixture'
import { listedAgentRunTaskRows } from '~/services/agentCollaboration/agentRunListedTaskRows'
import { agentRunAnswerFor } from '~/services/listedRuns/__tests__/listedRunAnswerFixture'
import { buildMobileRunTreeRows, type MobileRunTreeSources } from '~/utils/mobile/mobileRunTreeProjection'
import type { RunListEntry } from '~/utils/runListProjection'

const io = vi.hoisted(() => ({ query: vi.fn(), read: vi.fn(), build: vi.fn(), loadTarget: vi.fn(() => null) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: io.read, buildAgentRunCollaborationContext: io.build,
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationChildHydration', () => ({ hubChildLoadTarget: io.loadTarget }))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(async () => null) }) }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { useListedRunChildrenStore } from '../listedRunChildrenStore'

/**
 * autobyteus-461 SR-055: a listed standalone run that is not open shows the runs it delegated to from the history poll's
 * answer, with no view read: a child appears within one poll with its live status, leaves at the poll after its Task
 * closes and returns on a reopen. A row's click opens the run and selects the child once its view is published. The rows
 * are the view's rows for the same children; the open run's rows keep coming from its view.
 */
class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void
  send = vi.fn(); close = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }
const openWithView = async (view: AgentRunCollaborationViewDto) => {
  useAgentRunCollaborationStore().attach('host-run')
  const socket = Socket.instances.at(-1)!
  socket.frame({ type: 'CONNECTED', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', session_id: 'session' } })
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view } })
  await flush()
}

type Answer = RunCollaborationStatusesDto[number]
const answerFor = (view: AgentRunCollaborationViewDto, statusOf?: (agentRunId: string) => string): Answer =>
  ({ ...agentRunAnswerFor(view, statusOf), isActive: false })
const poll = async (answer: Answer) => {
  io.query.mockResolvedValueOnce({ data: { runCollaborationStatuses: [answer] } })
  await useListedRunChildrenStore().refresh([{ kind: 'agent', runId: 'host-run' }])
}
const keys = () => useAgentRunCollaborationStore().taskRows('host-run').map(({ row }) => row.rowKey)

beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks(); io.query.mockReset(); Socket.instances.length = 0
  vi.stubGlobal('WebSocket', Socket)
  io.read.mockImplementation(async () => agentRootView())
  io.build.mockImplementation(async ({ view }) => shallowReactive(buildChildRunsContext(view)))
})

describe('a listed agent run that is not open', () => {
  it('shows each child within one poll with its live status and no view read; it leaves on close and returns on reopen', async () => {
    const store = useAgentRunCollaborationStore()
    store.toggleTaskTeam('host-run', 'team-run')
    expect(keys()).toEqual([])
    await poll(answerFor(agentRootView(), () => 'running'))
    expect(store.taskRows('host-run').map(({ row, teamStatus }) => [row.rowKey, row.depth, row.currentStatus, teamStatus, row.delegatedBy])).toEqual([
      ['agent:cua-run', 0, 'running', null, 'research assistant'],
      ['team:team-run', 0, null, 'running', 'research assistant'],
      ['agent:pp-run', 1, 'running', null, null],
      ['agent:pb-run', 1, 'running', null, null],
    ])
    // The cua child's Task closes: the next poll's answer no longer has it.
    const closed = answerFor(agentRootView())
    await poll({ ...closed, children: closed.children.slice(1) })
    expect(keys()).toEqual(['team:team-run', 'agent:pp-run', 'agent:pb-run'])
    await poll(answerFor(agentRootView()))
    expect(keys()).toEqual(['agent:cua-run', 'team:team-run', 'agent:pp-run', 'agent:pb-run'])
    // No view was read or streamed for it, poll after poll.
    expect(io.read).not.toHaveBeenCalled()
    expect(Socket.instances).toHaveLength(0)
  })

  it('a click on a child row opens the run, then selects the child once the view is published', async () => {
    const store = useAgentRunCollaborationStore()
    await poll(answerFor(agentRootView()))
    const team = store.taskRows('host-run').find(({ row }) => row.rowKey === 'team:team-run')!.row
    // A task Team row selects its coordinator, from the answer.
    expect(store.selectTaskRow('host-run', team)).toBe(true)
    expect(store.selectedChild('host-run')).toBe('pp-run')
    const agent = store.taskRows('host-run').find(({ row }) => row.rowKey === 'agent:cua-run')!.row
    expect(store.selectTaskRow('host-run', agent)).toBe(true)
    await openWithView(agentRootView())
    expect(store.selectedChild('host-run')).toBe('cua-run')
    expect(store.childTargetFor('host-run')?.context.state.runId).toBe('cua-run')
    // Its stored details start loading with the published view.
    expect(io.loadTarget).toHaveBeenCalledWith(expect.objectContaining({ hostRunId: 'host-run', agentRunId: 'cua-run' }))
  })

  it('a child no longer in the view when it is published returns the view to the run\'s own agent', async () => {
    const store = useAgentRunCollaborationStore()
    await poll(answerFor(agentRootView()))
    store.selectTaskRow('host-run', store.taskRows('host-run')[0]!.row)
    const view = agentRootView()
    view.execution_tree = { ...view.execution_tree, taskExecutions: view.execution_tree.taskExecutions.slice(1) }
    view.agent_statuses = view.agent_statuses.filter((status) => status.agent_run_id !== 'cua-run')
    await openWithView(view)
    expect(store.selectedChild('host-run')).toBeNull()
  })

  it('its rows are the view\'s rows for the same children', () => {
    const view = agentRootView()
    const expanded = () => true
    expect(listedAgentRunTaskRows('host-run', answerFor(view), expanded)).toEqual(buildChildRunsContext(view).listTaskRows(expanded))
    const collapsed = () => false
    expect(listedAgentRunTaskRows('host-run', answerFor(view), collapsed)).toEqual(buildChildRunsContext(view).listTaskRows(collapsed))
  })

  it('phone: the same rows unfold under the run, each opening through the run', async () => {
    const store = useAgentRunCollaborationStore()
    store.toggleTaskTeam('host-run', 'team-run')
    await poll(answerFor(agentRootView(), () => 'running'))
    const entry = { kind: 'agent', key: 'agent:host-run', runId: 'host-run', name: 'Research Assistant', lastActivityAt: '', isActive: false,
      folderRootPath: '/ws', agentDefinitionId: 'research-assistant', avatarUrl: null,
      run: { runId: 'host-run', summary: '', lastActivityAt: '', currentStatus: 'offline', isActive: false, source: 'history', isDraft: false } } as unknown as RunListEntry
    const rows = buildMobileRunTreeRows(phoneSources({ entries: [entry], taskRows: (hostRunId) => store.taskRows(hostRunId),
      isTaskTeamExpanded: (hostRunId, teamRunId) => store.isTaskTeamExpanded(hostRunId, teamRunId) }))
    expect(rows.map((row) => [row.name, row.depth, row.status, row.open?.kind])).toEqual([
      ['Research Assistant', 0, 'offline', 'agentRun'], ['computer use agent', 1, 'running', 'taskRow'],
      ['product team', 1, 'running', 'taskRow'], ['prototyper', 2, 'running', 'taskRow'], ['bootstrapper', 2, 'running', 'taskRow'],
    ])
  })
})

describe('the open agent run', () => {
  it('keeps its view\'s rows whatever the poll answers', async () => {
    const store = useAgentRunCollaborationStore()
    await openWithView(agentRootView())
    const viewRows = store.taskRows('host-run')
    await poll({ ...answerFor(agentRootView()), children: [] })
    expect(store.taskRows('host-run')).toEqual(viewRows)
    expect(viewRows.map(({ row }) => row.rowKey)).toEqual(['agent:cua-run', 'team:team-run'])
  })
})

const phoneSources = (patch: Partial<MobileRunTreeSources>): MobileRunTreeSources => ({
  entries: [], taskRows: () => [], orgRows: () => [], remoteReachable: () => true, remoteTitle: () => null, taskSummary: () => null,
  isRunExpanded: () => true, isTeamExpanded: () => false, isTeamRowExpanded: () => false, isAgentOrgRunExpanded: () => true,
  isAgentOrgTeamExpanded: () => false, isTaskTeamExpanded: () => false, isAgentOrgTaskTeamExpanded: () => false, ...patch,
})
