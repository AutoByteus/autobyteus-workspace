import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AgentOrgExecutionEventDto,
  AgentOrgExecutionViewDto,
} from '@autobyteus/collaboration-stream-contracts'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
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

import { taskBearingView, taskRecord } from './taskBearingOrgFixture'

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

const settledEvent = (
  taskId: string,
  recipientAddress: string,
  taskExecution: { agentRunId: string } | { teamRunId: string },
): AgentOrgExecutionEventDto => ({
  kind: 'task',
  event: {
    kind: 'settled',
    settledAt: '2026-09-01T00:05:00.000Z',
    task: { ...taskRecord(taskId, recipientAddress, taskExecution), status: 'accepted' },
  },
})

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
    expect(context.view.task_records.records).toHaveLength(2)
    expect(context.changeSequence).toBe(8)

    context.select('/team')
    expect(context.selectedTarget()).toMatchObject({
      kind: 'agent_org_team_member',
      address: '/team/lead',
      context: { state: { runId: 'agent-lead-configured' } },
    })
    expect(mocks.query).toHaveBeenCalledTimes(7)
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
    staged.commitActivities()

    expect(useAgentActivityStore().getActivities('agent-director')).toEqual([
      expect.objectContaining({ kind: 'tool', invocationId: 'tool-1', status: 'success' }),
    ])
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

  it('projects a live settled task Agent to retained offline hierarchy truth without reload', async () => {
    const view = taskBearingView()
    const context = await hydrateAgentOrgExecutionContext({
      orgRunId: 'org-run',
      view,
    })
    context.getAgentContext('agent-worker-task')!.state.currentStatus = AgentStatus.Running
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

    expect(taskRowStatus()).toBe(AgentStatus.Running)
    expect(context.applyEvent(
      9,
      settledEvent('task-agent', '/worker', { agentRunId: 'agent-worker-task' }),
    )).toBe('applied')

    expect(context.view.task_records.records[0]).toMatchObject({
      taskId: 'task-agent',
      status: 'accepted',
    })
    expect(context.executionTree.rootOrg.taskExecutions[0]).toMatchObject({
      agentRunId: 'agent-worker-task',
      settledAt: '2026-09-01T00:05:00.000Z',
    })
    expect(context.view.agent_statuses.some((status) => status.agent_run_id === 'agent-worker-task')).toBe(false)
    expect(context.getAgentContext('agent-worker-task')!.state.currentStatus).toBe(AgentStatus.Offline)
    expect(taskRowStatus()).toBeUndefined()
    expect(context.changeSequence).toBe(9)
    expect(context.phase).toBe('live')
    expect(context.error).toBeNull()
  })

  it('projects every Agent in a settled task Team scope to offline current-context truth', async () => {
    const view = taskBearingView()
    const context = await hydrateAgentOrgExecutionContext({
      orgRunId: 'org-run',
      view,
    })
    context.getAgentContext('agent-task-lead')!.state.currentStatus = AgentStatus.Running
    context.getAgentContext('agent-task-worker')!.state.currentStatus = AgentStatus.Running

    expect(context.applyEvent(
      9,
      settledEvent('task-team', '/team', { teamRunId: 'team-task' }),
    )).toBe('applied')

    expect(context.executionTree.rootOrg.taskExecutions[1]).toMatchObject({
      teamRunId: 'team-task',
      settledAt: '2026-09-01T00:05:00.000Z',
    })
    expect(context.view.agent_statuses.filter((status) =>
      ['agent-task-lead', 'agent-task-worker'].includes(status.agent_run_id))).toEqual([])
    expect(context.getAgentContext('agent-task-lead')!.state.currentStatus).toBe(AgentStatus.Offline)
    expect(context.getAgentContext('agent-task-worker')!.state.currentStatus).toBe(AgentStatus.Offline)
    expect(context.phase).toBe('live')
    expect(context.error).toBeNull()
  })
})

async function hydrateAgentOrgExecutionContext(input: Omit<Parameters<typeof stageAgentOrgExecutionContext>[0], 'source'>) {
  const staged = await stageAgentOrgExecutionContext({ ...input, source: 'stream' })
  staged.commitActivities()
  return staged.context
}
