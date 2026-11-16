import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, teamId } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'
import type { TaskRootView } from '~/types/project'

const navigation = vi.hoisted(() => ({ open: vi.fn(), push: vi.fn(), isCurrent: vi.fn(() => true) }))
// A delegated row is its own run (autobyteus-461 rule 2); here every one is open.
vi.mock('~/stores/delegatedRunsStore', async () => {
  const fake = await import('~/test-support/delegatedRunsFake')
  fake.ownRuns.openAll = true
  return { useDelegatedRunsStore: fake.fakeDelegatedRunsStore }
})
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRouter: () => ({ push: navigation.push }) }))
// The opened run is the selected one (the card's reveal goes on while it is: F-59).
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ beginSelectionIntent: () => ({ isCurrent: navigation.isCurrent }),
  selectedType: 'agent', selectedRunId: 'host-run' }) }))
vi.mock('~/composables/useWorkspaceHistorySubjectActions', () => ({ useWorkspaceHistorySubjectActions: () => ({ execute: vi.fn() }) }))
vi.mock('~/services/workspace/workspaceNavigationService', () => ({ openWorkspaceExecutionLink: navigation.open, buildWorkspaceExecutionRoute: () => '/workspace/agent/host-run' }))

import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { multiTeamTree } from '~/test-support/runTreeFixtures'
import { useTaskRootNavigation } from '../useTaskRootNavigation'

beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  navigation.isCurrent.mockReturnValue(true); navigation.open.mockResolvedValue({ disposition: 'committed' })
})

it('explicit Task-root navigation opens its exact Team row unfolded at its coordinator, and a repeated open folds nothing (SR-084, G-F1, CR-461-108)', async () => {
  const store = useAgentRunCollaborationStore()
  store.contexts = { 'host-run': shallowReactive(buildMultiTeamContext()) }
  const tree = multiTeamTree()
  useRunTreeStore().streamSnapshot({ kind: 'agent', runId: 'host-run' }, tree.rows)
  const root: TaskRootView = {
    kind: 'team', recipientAddress: '/software_engineering_team', displayName: 'software engineering team', teamRunId: teamId(5), ingressAgentRunId: memberId(5, 0),
    delegatingRun: { kind: 'agent', runId: 'host-run' }, topRun: { kind: 'agent', runId: 'host-run' },
    openTarget: { runKind: 'agent_team', runId: teamId(5), agentRunId: memberId(5, 0) }, start: 'started', startError: null, closed: false, status: 'running',
  }
  const navigationAction = useTaskRootNavigation()
  await navigationAction.open(root); await navigationAction.open(root)
  expect(store.selectedRowKey('host-run')).toBe(`team:${teamId(5)}`)
  expect(store.selectedChild('host-run')).toBe(memberId(5, 0))
  const teams = tree.rows.filter((row) => row.kind === 'team')
  // CR-461-108: the opened Team row is unfolded (its coordinator shown); a repeated open folds nothing; the others stay folded.
  expect(teams.map((row) => store.isTreeRowExpanded('host-run', row))).toEqual(teams.map((row) => row.key === `team:${teamId(5)}`))
  expect(navigation.push).toHaveBeenCalledWith('/workspace/agent/host-run')
})
