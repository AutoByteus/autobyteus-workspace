import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, teamId } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'
import type { TaskRootView } from '~/types/project'

const navigation = vi.hoisted(() => ({ open: vi.fn(), push: vi.fn(), isCurrent: vi.fn(() => true) }))
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRouter: () => ({ push: navigation.push }) }))
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ beginSelectionIntent: () => ({ isCurrent: navigation.isCurrent }) }) }))
vi.mock('~/composables/useWorkspaceHistorySubjectActions', () => ({ useWorkspaceHistorySubjectActions: () => ({ execute: vi.fn() }) }))
vi.mock('~/services/workspace/workspaceNavigationService', () => ({ openWorkspaceExecutionLink: navigation.open, buildWorkspaceExecutionRoute: () => '/workspace/agent/host-run' }))

import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useTaskRootNavigation } from '../useTaskRootNavigation'

beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  navigation.isCurrent.mockReturnValue(true); navigation.open.mockResolvedValue({ disposition: 'committed' })
})

it('explicit Task-root navigation reveals only its exact Team and coordinator, and repeated open does not collapse it', async () => {
  const store = useAgentRunCollaborationStore()
  store.contexts = { 'host-run': shallowReactive(buildMultiTeamContext()) }
  const root: TaskRootView = {
    kind: 'team', recipientAddress: '/software_engineering_team', teamRunId: teamId(5), ingressAgentRunId: memberId(5, 0),
    hostRoot: { kind: 'agent', runId: 'host-run' }, start: 'started', startError: null, closed: false, status: 'running',
  }
  const navigationAction = useTaskRootNavigation()
  await navigationAction.open(root); await navigationAction.open(root)
  expect(store.selectedChild('host-run')).toBe(memberId(5, 0))
  expect(store.childTargetFor('host-run')?.agentRunId).toBe(memberId(5, 0))
  expect(Array.from({ length: 7 }, (_, index) => store.isTaskTeamExpanded('host-run', teamId(index)))).toEqual([false, false, false, false, false, true, false])
  expect(navigation.push).toHaveBeenCalledWith('/workspace/agent/host-run')
  expect(store.taskRows('host-run')).toHaveLength(13)
})
