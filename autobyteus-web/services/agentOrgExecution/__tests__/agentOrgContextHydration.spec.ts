import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { useRunFileChangesStore } from '~/stores/runFileChangesStore'

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
import { GetAgentOrgMemberFileChanges, GetAgentOrgMemberRunProjection, GetRunFileChanges } from '~/graphql/queries/runHistoryQueries'

describe('staged AgentOrg context hydration and publication', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.query.mockImplementation(async ({ variables }) => ({ data: { getAgentOrgMemberRunProjection: {
      agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    } } }))
  })

  it('a focused delegated row stages nothing through the Org: it is read as its own run (autobyteus-461 rule 2; SDV-03)', async () => {
    await hydrateAgentOrgExecutionContext({ orgRunId: 'org-run', view: taskBearingView(), focus: { kind: 'agent_execution', agentRunId: 'agent-worker-task' } })
    const queried = (document: unknown) => mocks.query.mock.calls.filter(([options]) => options.query === document)
    expect(queried(GetAgentOrgMemberRunProjection)).toHaveLength(0)
    expect(queried(GetAgentOrgMemberFileChanges)).toHaveLength(0)
  })

  it('builds the Org\'s own agents, each at its address, and stages only the focused one (autobyteus-358; autobyteus-461 rule 2)', async () => {
    const context = await hydrateAgentOrgExecutionContext({
      orgRunId: 'org-run',
      view: taskBearingView(),
      focus: { kind: 'agent_execution', agentRunId: 'agent-worker-configured' },
    })

    const entries = context.listAgentContextEntries()
    // A run the Org delegated is its own run: the Org's view holds none of its agents.
    expect(entries.map((entry) => entry.agentRunId))
      .toEqual(['agent-director', 'agent-worker-configured', 'agent-lead-configured', 'agent-team-worker-configured'])
    expect(context.changeSequence).toBe(8)

    context.select('/team')
    expect(context.selectedTarget()).toMatchObject({
      kind: 'agent_org_team_member',
      address: '/team/lead',
      context: { state: { runId: 'agent-lead-configured' } },
    })
    const queried = (document: unknown) => mocks.query.mock.calls.filter(([options]) => options.query === document)
    expect(queried(GetAgentOrgMemberRunProjection)).toHaveLength(1)
    expect(queried(GetAgentOrgMemberFileChanges).map(([options]) => options.variables)).toEqual([{
      orgRunId: 'org-run', memberAddress: '/worker', agentRunId: 'agent-worker-configured',
    }])
    expect(queried(GetRunFileChanges)).toHaveLength(0)
    expect(mocks.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        orgRunId: 'org-run', memberAddress: '/worker', agentRunId: 'agent-worker-configured',
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
      source: 'inspection', orgRunId: 'org-run', view: taskBearingView(), focus: '/director',
    })
    expect(useAgentActivityStore().getActivities('agent-director')).toEqual([])
    expect(staged.commit()).toBe('agent-director')

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
      if (query === GetRunFileChanges) throw new Error('org member artifacts are read through the org, not by run id')
      if (query === GetAgentOrgMemberFileChanges) {
        expect(variables.orgRunId).toBe('org-run')
        return variables.agentRunId === failingArtifactsFor
          ? { data: null, errors: [{ message: `artifacts unavailable for ${variables.agentRunId}` }] }
          : { data: { getAgentOrgMemberFileChanges: [artifact(variables.agentRunId, '1.png'), artifact(variables.agentRunId, '2.png')] } }
      }
      return { data: { getAgentOrgMemberRunProjection: {
        agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
      } } }
    })
    const paths = (runId: string) => useRunFileChangesStore().getArtifactsForRun(runId).map((entry) => entry.path)

    it.each([true, false])('commits the focused member artifact list on publication, a mounted Team member included; no other (active=%s; AC-003)', async (active) => {
      serve()
      const base = structuredClone(taskBearingView())
      const view = { ...base, is_active: active, agent_statuses: active ? base.agent_statuses : [] }
      const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view,
        focus: { kind: 'agent_execution', agentRunId: 'agent-lead-configured' } })
      expect(paths('agent-lead-configured')).toEqual([])

      expect(staged.commit()).toBe('agent-lead-configured')

      expect(paths('agent-lead-configured')).toEqual(['/outputs/1.png', '/outputs/2.png'])
      for (const { agentRunId } of staged.context.listAgentContextEntries()) {
        if (agentRunId !== 'agent-lead-configured') expect(paths(agentRunId)).toEqual([])
      }
    })

    it('writes no artifacts when member activity changed before publication', async () => {
      serve()
      const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: taskBearingView(), focus: '/director' })
      useAgentActivityStore().upsertSystemInstructionActivity('agent-director', {
        kind: 'system_instruction', activityId: 'live', content: 'live', timestamp: new Date(),
      })

      expect(() => staged.commit()).toThrow("AgentOrg activity changed before 'org-run' hydration could commit.")
      expect(paths('agent-director')).toEqual([])
      expect(paths('agent-lead-configured')).toEqual([])
    })

    it('fails staging when the focused member artifacts fail, as for its projection (AC-007)', async () => {
      serve('agent-lead-configured')
      await expect(stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: taskBearingView(),
        focus: { kind: 'agent_execution', agentRunId: 'agent-lead-configured' } }))
        .rejects.toThrow('artifacts unavailable for agent-lead-configured')
      expect(paths('agent-director')).toEqual([])
    })
  })

  it('never creates a workspace while observationally hydrating an active result', async () => {
    const view = structuredClone(taskBearingView())
    const director = view.execution_tree.rootOrg.members[0]
    if (!('agentRunId' in director)) throw new Error('Expected direct fixture Agent')
    director.launchConfiguration.workspaceRootPath = '/existing/workspace'
    mocks.resolveWorkspaceMetadataByRootPath.mockResolvedValue(null)

    const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view, focus: null })

    expect(staged.context.isActive).toBe(true)
    expect(mocks.resolveWorkspaceMetadataByRootPath).toHaveBeenCalledWith('/existing/workspace')
    expect(mocks.ensureWorkspaceByRootPath).not.toHaveBeenCalled()
    expect(staged.context.getAgentContext('agent-director')!.config.workspaceId).toBeNull()
  })

  it('rejects an unavailable focused projection without publishing any staged activities', async () => {
    mocks.query.mockImplementation(async ({ variables }) => ({ data: { getAgentOrgMemberRunProjection:
      variables.agentRunId === 'agent-worker-configured' ? null : {
        agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
        conversation: [], hasEarlierActiveTraceEvents: false,
        activities: [{ kind: 'tool', invocationId: 'staged-tool', toolName: 'read_file', status: 'success', result: 'done', ts: 1 }],
      },
    } }))
    await expect(stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: taskBearingView(),
      focus: { kind: 'agent_execution', agentRunId: 'agent-worker-configured' } }))
      .rejects.toThrow("Projection unavailable for 'agent-worker-configured'")
    expect(useAgentActivityStore().getActivities('agent-director')).toEqual([])
    expect(useAgentActivityStore().getActivities('agent-lead-configured')).toEqual([])
  })
})

async function hydrateAgentOrgExecutionContext(input: Omit<Parameters<typeof stageAgentOrgExecutionContext>[0], 'source' | 'focus'>
  & { focus?: Parameters<typeof stageAgentOrgExecutionContext>[0]['focus'] }) {
  const staged = await stageAgentOrgExecutionContext({ focus: null, ...input, source: 'stream' })
  staged.commit()
  return staged.context
}

