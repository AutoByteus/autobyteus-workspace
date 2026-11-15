import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, multiTeamView, teamId } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'

/**
 * autobyteus-461 SR-083 (FU-026, AR-028): an Agent run's view shows each delegated run's status as that run answers it
 * by run ID (`/ws/run-status`), not from its delegator; a listed view that is not open reads its view again when its
 * rows changed, the newest read winning.
 */
const hydration = vi.hoisted(() => ({ read: vi.fn(), build: vi.fn() }))
vi.mock('~/stores/delegatedRunsStore', async () => ({ useDelegatedRunsStore: (await import('~/test-support/delegatedRunsFake')).fakeDelegatedRunsStore }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: hydration.read, buildAgentRunCollaborationContext: hydration.build,
}))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(async () => null) }) }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { useRunStatusStore } from '../runStatusStore'

const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }

beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

describe('an Agent run\'s view and its delegated runs\' own statuses (SR-083)', () => {
  it('holds its delegated runs, and shows each agent\'s status as its own run answers it', async () => {
    const runStatus = useRunStatusStore()
    const hold = vi.spyOn(runStatus, 'hold').mockImplementation(() => () => undefined)
    const store = useAgentRunCollaborationStore()
    store.contexts = { 'host-run': shallowReactive(buildMultiTeamContext(multiTeamView(2))) }
    await nextTick()
    expect(hold).toHaveBeenLastCalledWith(expect.arrayContaining([{ kind: 'agent', runId: 'host-run' },
      { kind: 'agent_team', runId: teamId(0) }, { kind: 'agent_team', runId: teamId(1) }]))
    runStatus.apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [{ kind: 'agent_team', runId: teamId(1), answer: 'ok', node: null, status: null, agents: [{ agentRunId: memberId(1, 0), status: 'running' }] }] } })
    await nextTick()
    expect(store.contextFor('host-run')!.getAgentContext(memberId(1, 0))?.state.currentStatus).toBe('running')
  })

  it('AR-028: a listed view that is not open reads its view again when its rows changed', async () => {
    const runStatus = useRunStatusStore()
    vi.spyOn(runStatus, 'hold').mockImplementation(() => () => undefined)
    const store = useAgentRunCollaborationStore()
    store.contexts = { 'host-run': shallowReactive(buildMultiTeamContext(multiTeamView(1))) }
    await nextTick()
    hydration.read.mockResolvedValue(multiTeamView(2))
    hydration.build.mockImplementation(async ({ view }: { view: ReturnType<typeof multiTeamView> }) => buildMultiTeamContext(view))
    runStatus.apply({ type: 'RUN_TREE_CHANGED', payload: { kind: 'agent', runId: 'host-run' } })
    await nextTick(); await flush()
    expect(hydration.read).toHaveBeenCalledWith('host-run')
    expect(store.contextFor('host-run')!.index.teams.size).toBe(2)
  })
})
