import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { GetTeamMemberRunProjection } from '~/graphql/queries/runHistoryQueries'

const io = vi.hoisted(() => ({ query: vi.fn(), unreachable: true, reads: [] as string[] }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/services/runHydration/teamCommunicationHydrationService', () => ({ fetchTeamCommunicationForTeam: vi.fn(async () => []) }))
vi.mock('~/stores/runHistoryNavigationStoreActions', () => ({ refreshRunNavigationTopologyForStore: vi.fn() }))

import { openTeamRun } from '../teamRunOpenCoordinator'
import { inspectTeamMemberForStore, reconcileFocusedTeamMemberProjectionForStore } from '~/stores/runHistoryTeamMemberInspectionActions'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import { isTeamMemberProjectionAuthoritative } from '~/services/runHydration/teamMemberProjectionHydrationService'

/**
 * autobyteus-278 CRR-006 F-006: a member of a run another node runs, in a Team root's view, is focused and committed
 * first and read from its node after. With its node down the selection commits, the notice shows (its run is
 * unreachable) and no Team inspection error is set; Retry then loads it. Only GraphQL is a fixture.
 */

const TEAM = 'team-root'
const remoteTeam = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/lead', members: [{ address: '/marketing_team/lead', agent_run_id: 'lead-run' }],
  delegator_agent_run_id: 'coordinator-run', started_at: '2026-10-23T08:00:00.000Z',
}
const tree = buildTestTeamContext({ teamRunId: TEAM, teamDefinitionId: 'team-def', teamDefinitionName: 'Studio', coordinatorAddress: '/coordinator',
  rootChildren: [testAgentNode('/coordinator', { agentRunId: 'coordinator-run', agentDefinitionId: 'coordinator', llmModelIdentifier: 'gpt-test' })] })
  .view.getExecutionTree()
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
const store = () => ({ teamMemberInspectionByIdentity: {} as Record<string, unknown>, error: null, selectedRunId: null,
  selectedTeamRunId: null as string | null, selectedTeamMemberAddress: null as string | null, workspaceGroups: [] } as never)
const inspectionOf = (state: { teamMemberInspectionByIdentity: Record<string, unknown> }) => Object.values(state.teamMemberInspectionByIdentity)
const open = (agentRunId: string) => openTeamRun({ teamRunId: TEAM, agentRunId, selectRun: false,
  resolveWorkspaceMetadataByRootPath: vi.fn(async () => null), ensureWorkspaceByRootPath: vi.fn(async () => null) })

describe("a Team root's remote member, its node down", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    Object.assign(io, { unreachable: true, reads: [] })
    io.query.mockImplementation(async ({ query, variables }: { query: unknown; variables: Record<string, unknown> }) => {
      if (!variables.agentRunId) {
        return { data: { getTeamRunResumeConfig: { remoteTaskExecutions: [remoteTeam], closedTaskExecutions: [], teamRunId: TEAM,
          isActive: false, executionTree: tree, modelConfigEditability: { editable: true, reason: null } } } }
      }
      if (query === GetTeamMemberRunProjection) io.reads.push(String(variables.agentRunId))
      if (variables.agentRunId === 'lead-run' && io.unreachable) return { data: null, errors: [{ message: 'REMOTE_PEER_UNREACHABLE' }] }
      return { data: { getTeamMemberRunProjection: { agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false },
        getTeamMemberFileChanges: [] } }
    })
  })

  it('opening the Team on it commits the focus and shows the notice; Retry then loads it', async () => {
    const result = await open('lead-run')
    expect(result).toMatchObject({ disposition: 'committed', focusedAgentRunId: 'lead-run' })
    await flush()
    const remoteRuns = useRemoteRunsStore()
    expect(io.reads).toContain('lead-run')
    expect(remoteRuns.run('marketing-run')).toMatchObject({ reachable: false, checking: false })

    io.unreachable = false
    remoteRuns.retry('marketing-run'); await flush()
    expect(remoteRuns.run('marketing-run')).toMatchObject({ reachable: true, checking: false })
    expect(isTeamMemberProjectionAuthoritative(useAgentTeamContextsStore().getTeamContextById(TEAM)!, 'lead-run')).toBe(true)
  })

  it('selecting it in the mounted Team commits the selection and sets no inspection error; the focused reconcile neither', async () => {
    await open('coordinator-run')
    const state = store() as unknown as { teamMemberInspectionByIdentity: Record<string, unknown>; selectedTeamMemberAddress: string | null }
    const result = await inspectTeamMemberForStore(state as never, TEAM, 'lead-run')
    await flush()
    expect(result).toMatchObject({ disposition: 'committed', agentRunId: 'lead-run' })
    expect(state.selectedTeamMemberAddress).toBe('/marketing_team/lead')
    expect(useAgentTeamContextsStore().getTeamContextById(TEAM)!.view.getFocusedAgentRunId()).toBe('lead-run')
    expect(inspectionOf(state)).toEqual([])
    expect(useRemoteRunsStore().run('marketing-run')?.reachable).toBe(false)

    await reconcileFocusedTeamMemberProjectionForStore(state as never, TEAM, 'lead-run'); await flush()
    expect(inspectionOf(state)).toEqual([])
  })
})
