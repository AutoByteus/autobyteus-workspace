import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures'
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress'

const {
  ensureHistoricalTeamMemberHydratedMock,
  primeRecentEventMonitorBaselineMock,
  resetRecentEventMonitorBaselineMock,
  refreshRunNavigationTopologyMock,
} = vi.hoisted(() => ({
  ensureHistoricalTeamMemberHydratedMock: vi.fn().mockResolvedValue(undefined),
  primeRecentEventMonitorBaselineMock: vi.fn(),
  resetRecentEventMonitorBaselineMock: vi.fn(),
  refreshRunNavigationTopologyMock: vi.fn(),
}))

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  ensureHistoricalTeamMemberHydrated: ensureHistoricalTeamMemberHydratedMock,
}))

vi.mock('~/services/eventMonitor/recentEventMonitorMutationCoordinator', () => ({
  primeRecentEventMonitorBaseline: primeRecentEventMonitorBaselineMock,
  resetRecentEventMonitorBaseline: resetRecentEventMonitorBaselineMock,
}))

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({ refreshRunNavigationTopology: refreshRunNavigationTopologyMock }),
}))

const address = (
  rootTeamRunId: string,
  memberAddress: string,
  taskTeamRunIds: string[] = [],
  taskAgentRunId: string | null = null,
) => createTeamExecutionAddress({ rootTeamRunId, memberAddress, taskTeamRunIds, taskAgentRunId })

describe('agentTeamContextsStore current Team execution contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('indexes a current context by its exact root TeamRun identity and exposes current getters', () => {
    const store = useAgentTeamContextsStore()
    const selection = useAgentSelectionStore()
    const team = buildTestTeamContext({
      teamRunId: 'team-1',
      coordinatorAddress: '/coordinator',
      rootChildren: [
        testAgentNode('/coordinator', { displayName: 'Coordinator', agentRunId: 'coordinator-run' }),
        testAgentNode('/worker', { displayName: 'Worker', agentRunId: 'worker-run' }),
      ],
    })

    store.addTeamContext(team)
    selection.selectRunWithoutShellNavigation('team-1', 'team')

    expect(store.getTeamContextById('team-1')).toBe(team)
    expect(store.activeTeamContext).toBe(team)
    expect(store.focusedMemberNode).toMatchObject({ kind: 'agent', address: '/coordinator' })
    expect(store.focusedMemberContext?.state.runId).toBe('coordinator-run')
    expect(store.teamMembers.map((entry) => entry.memberAddress)).toEqual(['/coordinator', '/worker'])
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(2)
    expect(refreshRunNavigationTopologyMock).toHaveBeenCalledWith('team-context-add')
  })

  it('preserves rooted nested topology while execution lookup remains address-based', () => {
    const store = useAgentTeamContextsStore()
    const reviewer = testAgentNode('/BuildSquad/reviewer', { agentRunId: 'reviewer-run' })
    const implementer = testAgentNode('/BuildSquad/implementer', { agentRunId: 'implementer-run' })
    const team = buildTestTeamContext({
      teamRunId: 'nested-team-1',
      coordinatorAddress: '/program_manager',
      rootChildren: [
        testAgentNode('/program_manager', { agentRunId: 'program-manager-run' }),
        testSubTeamNode('/BuildSquad', [reviewer, implementer], {
          teamRunId: 'build-squad-run',
          coordinatorAddress: reviewer.address,
        }),
      ],
    })

    store.addTeamContext(team)

    expect(team.topology.rootTeam.children).toMatchObject([
      { kind: 'agent', address: '/program_manager' },
      {
        kind: 'agent_team',
        address: '/BuildSquad',
        children: [
          { kind: 'agent', address: '/BuildSquad/reviewer' },
          { kind: 'agent', address: '/BuildSquad/implementer' },
        ],
      },
    ])
    expect(team.executions.getAgentContext(address('nested-team-1', reviewer.address))?.state.runId)
      .toBe('reviewer-run')
    expect(team.executions.getAgentContext(address('nested-team-1', implementer.address))?.state.runId)
      .toBe('implementer-run')
  })

  it('focuses an exact persistent member, preserves every composer, and requests historical hydration', async () => {
    const store = useAgentTeamContextsStore()
    const selection = useAgentSelectionStore()
    const coordinatorContext = testAgentContext({ runId: 'coordinator-run', displayName: 'Coordinator' })
    coordinatorContext.requirement = 'keep this coordinator draft'
    coordinatorContext.contextFilePaths = [{
      kind: 'workspace_path',
      id: '/tmp/a.txt',
      locator: '/tmp/a.txt',
      displayName: 'a.txt',
      type: 'Text',
    }]
    const team = buildTestTeamContext({
      teamRunId: 'history-team-1',
      coordinatorAddress: '/coordinator',
      rootChildren: [
        testAgentNode('/coordinator', { agentRunId: 'coordinator-run' }),
        testAgentNode('/worker', { agentRunId: 'worker-run' }),
      ],
      contexts: [{ executionAddress: address('history-team-1', '/coordinator'), context: coordinatorContext }],
    })
    store.addTeamContext(team)
    selection.selectRunWithoutShellNavigation('history-team-1', 'team')

    const workerAddress = address('history-team-1', '/worker')
    await store.focusMemberAndEnsureHydrated('history-team-1', workerAddress)

    expect(team.executions.getFocusedAddress()).toEqual(workerAddress)
    expect(team.executions.getAgentContext(address('history-team-1', '/coordinator'))?.requirement)
      .toBe('keep this coordinator draft')
    expect(team.executions.getAgentContext(address('history-team-1', '/coordinator'))?.contextFilePaths)
      .toHaveLength(1)
    expect(team.executions.getAgentContext(workerAddress)?.requirement).toBe('')
    expect(ensureHistoricalTeamMemberHydratedMock).toHaveBeenCalledWith({
      teamContext: team,
      memberAddress: '/worker',
    })
  })

  it('focuses a concrete task Agent without invoking persistent-history hydration', async () => {
    const store = useAgentTeamContextsStore()
    const selection = useAgentSelectionStore()
    const taskAddress = address('task-team-1', '/worker', [], 'task-agent-run-1')
    const team = buildTestTeamContext({
      teamRunId: 'task-team-1',
      coordinatorAddress: '/coordinator',
      rootChildren: [
        testAgentNode('/coordinator', { agentRunId: 'coordinator-run' }),
        testAgentNode('/worker', { agentRunId: 'worker-run' }),
      ],
      tasks: [testTaskProjection({
        taskId: 'task-1',
        executionAddress: taskAddress,
        senderAddress: address('task-team-1', '/coordinator'),
      })],
    })
    store.addTeamContext(team)
    selection.selectRunWithoutShellNavigation('task-team-1', 'team')

    await store.focusMemberAndEnsureHydrated('task-team-1', taskAddress)

    expect(team.executions.getFocusedAddress()).toEqual(taskAddress)
    expect(team.executions.getAgentContext(taskAddress)?.state.runId).toBe('task-agent-run-1')
    expect(ensureHistoricalTeamMemberHydratedMock).not.toHaveBeenCalled()
  })

  it('fails closed for a foreign-root focus without changing the current selection', async () => {
    const store = useAgentTeamContextsStore()
    const team = buildTestTeamContext({
      teamRunId: 'team-1',
      coordinatorAddress: '/coordinator',
      rootChildren: [testAgentNode('/coordinator'), testAgentNode('/worker')],
    })
    store.addTeamContext(team)
    const initialFocus = team.executions.getFocusedAddress()

    await store.focusMemberAndEnsureHydrated('team-1', address('foreign-team', '/worker'))

    expect(team.executions.getFocusedAddress()).toEqual(initialFocus)
    expect(ensureHistoricalTeamMemberHydratedMock).not.toHaveBeenCalled()
  })
})
