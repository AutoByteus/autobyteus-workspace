import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AgentOrgExecutionEventDto,
  AgentOrgExecutionViewDto,
} from '@autobyteus/collaboration-stream-contracts'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { useRunFileChangesStore } from '~/stores/runFileChangesStore'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { projectAgentOrgHistoryRows } from '~/utils/agentOrgHistoryRows'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  ensureWorkspaceByRootPath: vi.fn(),
  resolveWorkspaceMetadataByRootPath: vi.fn(),
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: mocks.query }),
}))
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({
    ensureWorkspaceByRootPath: mocks.ensureWorkspaceByRootPath,
    resolveWorkspaceMetadataByRootPath: mocks.resolveWorkspaceMetadataByRootPath,
  }),
}))

import { stageAgentOrgExecutionContext } from '../agentOrgContextHydration'

import { taskBearingView } from './taskBearingOrgFixture'
import { GetAgentOrgMemberRunProjection, GetRunFileChanges } from '~/graphql/queries/runHistoryQueries'

const liveHistoryRun = (view: AgentOrgExecutionViewDto): AgentOrgRunHistoryItem => ({
  stableKey: 'agent_org:org-run',
  rootSubjectKind: 'agent_org',
  rootRunId: 'org-run',
  createdAt: view.execution_tree.createdAt,
  archivedAt: null,
  isActive: true,
  summary: 'Restored Org',
  executionTree: view.execution_tree,
})

const offlineEvent = (memberAddress: string, agentRunId: string): AgentOrgExecutionEventDto => ({
  kind: 'agent_presentation', member_address: memberAddress, agent_run_id: agentRunId,
  message: { type: 'AGENT_STATUS', payload: {
    status: 'offline', trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
  } },
} as AgentOrgExecutionEventDto)

describe('staged AgentOrg context hydration and publication', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.query.mockImplementation(async ({ variables }) => ({ data: { getAgentOrgMemberRunProjection: {
      agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    } } }))
  })

  it('hydrates configured and fresh task runs with shared placement addresses and exact run identities', async () => {
    const context = await hydrateAgentOrgExecutionContext({
      orgRunId: 'org-run',
      view: taskBearingView(),
    })

    const entries = context.listAgentContextEntries()
    expect(entries).toHaveLength(7)
    expect(entries.filter((entry) => entry.memberAddress === '/worker').map((entry) => entry.agentRunId))
      .toEqual(['agent-worker-configured', 'agent-worker-task'])
    expect(entries.filter((entry) => entry.memberAddress === '/team/lead').map((entry) => entry.agentRunId))
      .toEqual(['agent-lead-configured', 'agent-task-lead'])
    expect(context.executionTree.rootOrg.taskExecutions.map((task) => task.delegatorAgentRunId))
      .toEqual(['agent-director', 'agent-director'])
    expect(context.changeSequence).toBe(8)

    context.select('/team')
    expect(context.selectedTarget()).toMatchObject({
      kind: 'agent_org_team_member',
      address: '/team/lead',
      context: { state: { runId: 'agent-lead-configured' } },
    })
    const queried = (document: unknown) => mocks.query.mock.calls.filter(([options]) => options.query === document)
    expect(queried(GetAgentOrgMemberRunProjection)).toHaveLength(7)
    expect(queried(GetRunFileChanges)).toHaveLength(7)
    expect(mocks.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        orgRunId: 'org-run', memberAddress: '/worker', agentRunId: 'agent-worker-task',
      },
    }))
  })

  it('commits projection activities through the current atomic activity replacement owner', async () => {
    mocks.query.mockImplementation(async ({ variables }: { variables: { agentRunId: string; memberAddress: string } }) => ({
      data: { getAgentOrgMemberRunProjection: variables.agentRunId === 'agent-director'
        ? {
            agentRunId: 'agent-director', memberAddress: '/director', conversation: [],
            hasEarlierActiveTraceEvents: false,
            activities: [{
              kind: 'tool', invocationId: 'tool-1', toolName: 'read_file',
              status: 'success', result: 'done', ts: 1,
            }],
          }
        : { agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } },
    }))

    const staged = await stageAgentOrgExecutionContext({
      source: 'inspection', orgRunId: 'org-run', view: taskBearingView(),
    })
    expect(useAgentActivityStore().getActivities('agent-director')).toEqual([])
    staged.commit()

    expect(useAgentActivityStore().getActivities('agent-director')).toEqual([
      expect.objectContaining({ kind: 'tool', invocationId: 'tool-1', status: 'success' }),
    ])
  })

  describe('member artifacts', () => {
    const artifact = (runId: string, name: string) => ({
      id: `${runId}:/outputs/${name}`, runId, path: `/outputs/${name}`, type: 'image', status: 'available',
      sourceTool: 'generated_output', sourceInvocationId: null, content: null,
      createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z',
    })
    const serve = (failingArtifactsFor?: string) => mocks.query.mockImplementation(async ({ query, variables }) => {
      if (query === GetRunFileChanges) {
        return variables.runId === failingArtifactsFor
          ? { data: null, errors: [{ message: `artifacts unavailable for ${variables.runId}` }] }
          : { data: { getRunFileChanges: [artifact(variables.runId, '1.png'), artifact(variables.runId, '2.png')] } }
      }
      return { data: { getAgentOrgMemberRunProjection: {
        agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
      } } }
    })
    const paths = (runId: string) => useRunFileChangesStore().getArtifactsForRun(runId).map((entry) => entry.path)

    it.each([true, false])('commits every member artifact list on publication, including nested Team members (active=%s; AC-003, AC-004)', async (active) => {
      serve()
      const view = structuredClone(taskBearingView())
      view.is_active = active
      if (!active) view.agent_statuses = []
      const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view })
      expect(paths('agent-director')).toEqual([])

      staged.commit()

      for (const { agentRunId } of staged.context.listAgentContextEntries()) {
        expect(paths(agentRunId)).toEqual(['/outputs/1.png', '/outputs/2.png'])
      }
      expect(paths('agent-task-lead')).toEqual(['/outputs/1.png', '/outputs/2.png'])
    })

    it('writes no artifacts when member activity changed before publication', async () => {
      serve()
      const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: taskBearingView() })
      useAgentActivityStore().upsertSystemInstructionActivity('agent-director', {
        kind: 'system_instruction', activityId: 'live', content: 'live', timestamp: new Date(),
      })

      expect(() => staged.commit()).toThrow("AgentOrg activity changed before 'org-run' hydration could commit.")
      expect(paths('agent-director')).toEqual([])
      expect(paths('agent-task-lead')).toEqual([])
    })

    it('fails staging when one member artifacts fail, as for its projection (AC-007)', async () => {
      serve('agent-task-lead')
      await expect(stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: taskBearingView() }))
        .rejects.toThrow('artifacts unavailable for agent-task-lead')
      expect(paths('agent-director')).toEqual([])
    })
  })

  it('never creates a workspace while observationally hydrating an active result', async () => {
    const view = structuredClone(taskBearingView())
    const director = view.execution_tree.rootOrg.members[0]
    if (!('agentRunId' in director)) throw new Error('Expected direct fixture Agent')
    director.launchConfiguration.workspaceRootPath = '/existing/workspace'
    mocks.resolveWorkspaceMetadataByRootPath.mockResolvedValue(null)

    const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view })

    expect(staged.context.isActive).toBe(true)
    expect(mocks.resolveWorkspaceMetadataByRootPath).toHaveBeenCalledWith('/existing/workspace')
    expect(mocks.ensureWorkspaceByRootPath).not.toHaveBeenCalled()
    expect(staged.context.getAgentContext('agent-director')!.config.workspaceId).toBeNull()
  })

  it('rejects one unavailable exact projection without publishing any staged activities', async () => {
    mocks.query.mockImplementation(async ({ variables }) => ({ data: { getAgentOrgMemberRunProjection:
      variables.agentRunId === 'agent-task-worker' ? null : {
        agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
        conversation: [], hasEarlierActiveTraceEvents: false,
        activities: [{ kind: 'tool', invocationId: 'staged-tool', toolName: 'read_file', status: 'success', result: 'done', ts: 1 }],
      },
    } }))
    await expect(stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: taskBearingView() }))
      .rejects.toThrow("Projection unavailable for 'agent-task-worker'")
    expect(useAgentActivityStore().getActivities('agent-director')).toEqual([])
    expect(useAgentActivityStore().getActivities('agent-task-lead')).toEqual([])
  })

  it('projects an idle-shutdown task Agent as offline while its hierarchy row stays visible', async () => {
    const view = taskBearingView()
    const context = await hydrateAgentOrgExecutionContext({
      orgRunId: 'org-run',
      view,
    })
    context.getAgentContext('agent-worker-task')!.state.currentStatus = AgentStatus.Idle
    const run = liveHistoryRun(view)
    const taskRowStatus = () => {
      const row = projectAgentOrgHistoryRows({
        run,
        context,
        isTeamExpanded: () => true,
      }).map((item) => item.row)
        .find((candidate) => candidate.kind === 'task_agent'
          && candidate.agentRunId === 'agent-worker-task')
      return row?.kind === 'task_agent' ? row.status : undefined
    }

    expect(taskRowStatus()).toBe(AgentStatus.Idle)
    expect(context.applyEvent(9, offlineEvent('/worker', 'agent-worker-task'))).toBe('applied')

    expect(context.executionTree.rootOrg.taskExecutions[0]).toMatchObject({
      agentRunId: 'agent-worker-task',
      delegatorAgentRunId: 'agent-director',
    })
    expect(context.executionTree.rootOrg.taskExecutions[0]).not.toHaveProperty('settledAt')
    expect(context.getAgentContext('agent-worker-task')!.state.currentStatus).toBe(AgentStatus.Offline)
    expect(taskRowStatus()).toBe(AgentStatus.Offline)
    expect(context.changeSequence).toBe(9)
    expect(context.phase).toBe('live')
    expect(context.error).toBeNull()
  })

  it('projects every Agent in an idle-shutdown task Team to offline without removing the execution', async () => {
    const view = taskBearingView()
    const context = await hydrateAgentOrgExecutionContext({
      orgRunId: 'org-run',
      view,
    })

    expect(context.applyEvent(9, offlineEvent('/team/lead', 'agent-task-lead'))).toBe('applied')
    expect(context.applyEvent(10, offlineEvent('/team/worker', 'agent-task-worker'))).toBe('applied')

    expect(context.executionTree.rootOrg.taskExecutions[1]).toMatchObject({ teamRunId: 'team-task' })
    expect(context.getAgentContext('agent-task-lead')!.state.currentStatus).toBe(AgentStatus.Offline)
    expect(context.getAgentContext('agent-task-worker')!.state.currentStatus).toBe(AgentStatus.Offline)
    expect(context.phase).toBe('live')
    expect(context.error).toBeNull()
  })

  it('hosts a collaborator Team in place on collaborator_added: Offline contexts and an opened Team row (no reload)', async () => {
    const view = taskBearingView()
    const context = await hydrateAgentOrgExecutionContext({ orgRunId: 'org-run', view })
    const launch = view.execution_tree.rootOrg.defaultLaunchConfiguration
    expect(context.applyEvent(9, { kind: 'collaborator_added', collaborator: {
      kind: 'agent_team', address: '/product_team', teamDefinitionId: 'product-team', teamRunId: 'product-run',
      coordinatorAddress: '/product_team/product_prototyper',
      members: [{ address: '/product_team/product_prototyper', agentDefinitionId: 'prototyper', agentRunId: 'pp-run', platformAgentRunId: null }],
      handoffs: [], defaultLaunchConfiguration: launch, taskExecutions: [], addedAt: view.execution_tree.createdAt, addedViaAgentRunId: 'agent-director',
    } } as AgentOrgExecutionEventDto)).toBe('applied')
    expect(context.phase).toBe('live')
    expect(context.getAgentContext('pp-run')).toMatchObject({ config: { agentDefinitionId: 'prototyper', agentDefinitionName: 'product prototyper' } })
    expect(context.getAgentContext('pp-run')!.state.currentStatus).toBe(AgentStatus.Offline)
    const rows = projectAgentOrgHistoryRows({ run: liveHistoryRun({ ...view, execution_tree: context.executionTree } as never), context, isTeamExpanded: () => true })
      .map((item) => item.row)
    expect(rows.find((row) => row.kind === 'task_team' && row.teamRunId === 'product-run')).toBeTruthy()
    expect(rows.find((row) => 'agentRunId' in row && row.agentRunId === 'pp-run')).toBeTruthy()
  })
})

async function hydrateAgentOrgExecutionContext(input: Omit<Parameters<typeof stageAgentOrgExecutionContext>[0], 'source'>) {
  const staged = await stageAgentOrgExecutionContext({ ...input, source: 'stream' })
  staged.commit()
  return staged.context
}
