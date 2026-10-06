import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GetAgentRunCollaborationMemberProjection } from '~/graphql/queries/collaboratorQueries'
import { GetRunFileChanges } from '~/graphql/queries/runHistoryQueries'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { useRunFileChangesStore } from '~/stores/runFileChangesStore'
import { stageAgentRunCollaborationContext } from '../agentRunCollaborationHydration'
import { agentRootView } from './agentRootFixture'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  ensureWorkspaceByRootPath: vi.fn(async () => null),
  resolveWorkspaceMetadataByRootPath: vi.fn(async () => null),
}) }))

const COLLABORATORS = ['cua-run', 'pp-run', 'pb-run']
const artifact = (runId: string, name: string, overrides: Record<string, unknown> = {}) => ({
  id: `${runId}:/outputs/${name}`, runId, path: `/outputs/${name}`, type: 'image', status: 'available',
  sourceTool: 'generated_output', sourceInvocationId: null, content: null,
  createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z', ...overrides,
})
const serve = (failingArtifactsFor?: string) => mocks.query.mockImplementation(async ({ query, variables }) => {
  if (query === GetRunFileChanges) {
    return variables.runId === failingArtifactsFor
      ? { data: null, errors: [{ message: `artifacts unavailable for ${variables.runId}` }] }
      : { data: { getRunFileChanges: [artifact(variables.runId, '1.png'), artifact(variables.runId, '2.png')] } }
  }
  if (query === GetAgentRunCollaborationMemberProjection) {
    return { data: { agentRunCollaborationMemberProjection: {
      agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
      conversation: [], activities: [{ kind: 'system_instruction', activityId: `projected-${variables.agentRunId}`, content: 'projected', ts: 1 }],
      hasEarlierActiveTraceEvents: false,
    } } }
  }
  throw new Error('Unexpected query')
})
const viewFor = (active: boolean) => {
  const view = agentRootView()
  view.is_active = active
  if (!active) view.agent_statuses = []
  return view
}
const paths = (runId: string) => useRunFileChangesStore().getArtifactsForRun(runId).map((entry) => entry.path)

describe('stageAgentRunCollaborationContext member artifacts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it.each([true, false])('commits every collaborator artifact list on publication (active=%s; AC-001, AC-002)', async (active) => {
    serve()
    const staged = await stageAgentRunCollaborationContext({ hostRunId: 'host-run', view: viewFor(active) })
    expect(paths('cua-run')).toEqual([])

    staged.commit()

    for (const runId of COLLABORATORS) {
      expect(paths(runId)).toEqual(['/outputs/1.png', '/outputs/2.png'])
      expect(useAgentActivityStore().getActivities(runId)).toEqual([expect.objectContaining({ activityId: `projected-${runId}` })])
    }
    expect(mocks.query.mock.calls.filter(([options]) => options.query === GetRunFileChanges)).toHaveLength(COLLABORATORS.length)
  })

  it('keeps a live FILE_CHANGE newer than the hydrated snapshot without duplicating it (AC-003)', async () => {
    serve()
    const staged = await stageAgentRunCollaborationContext({ hostRunId: 'host-run', view: viewFor(true) })
    useRunFileChangesStore().upsertFromLivePayload(artifact('cua-run', '1.png', { status: 'streaming', updatedAt: '2026-10-06T10:00:05.000Z' }) as never)

    staged.commit()

    const entries = useRunFileChangesStore().getArtifactsForRun('cua-run')
    expect(entries.map((entry) => entry.path).sort()).toEqual(['/outputs/1.png', '/outputs/2.png'])
    expect(entries.find((entry) => entry.path === '/outputs/1.png')).toMatchObject({ status: 'streaming' })
  })

  it('writes no artifacts when collaborator activity changed before publication', async () => {
    serve()
    const staged = await stageAgentRunCollaborationContext({ hostRunId: 'host-run', view: viewFor(true) })
    useAgentActivityStore().upsertSystemInstructionActivity('pp-run', {
      kind: 'system_instruction', activityId: 'live', content: 'live', timestamp: new Date(),
    })

    expect(() => staged.commit()).toThrow("Agent collaboration activity changed before 'host-run' hydration could commit.")
    for (const runId of COLLABORATORS) expect(paths(runId)).toEqual([])
  })

  it('writes nothing once hydration ownership is released', async () => {
    serve()
    let current = true
    const staged = await stageAgentRunCollaborationContext({ hostRunId: 'host-run', view: viewFor(true), isCurrent: () => current })
    current = false

    expect(() => staged.commit()).toThrow('Agent collaboration hydration ownership released.')
    for (const runId of COLLABORATORS) expect(paths(runId)).toEqual([])
  })

  it('fails staging when one collaborator artifacts fail, as for its projection (AC-005)', async () => {
    serve('pb-run')
    await expect(stageAgentRunCollaborationContext({ hostRunId: 'host-run', view: viewFor(true) }))
      .rejects.toThrow('artifacts unavailable for pb-run')
    expect(paths('cua-run')).toEqual([])
  })
})
