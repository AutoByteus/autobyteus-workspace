import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, multiTeamView, teamId } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'
import { created, launch } from '~/services/agentCollaboration/__tests__/agentRootFixture'
import type { TaskRootView } from '~/types/project'

/**
 * autobyteus-461 CR-461-076 (F-54), SR-080: the Task card opens its worker where its row lives, the view of the top of its
 * tree, as clicking that row does: the row selected there, so the worker opens as its own run (rule 2).
 */
const navigation = vi.hoisted(() => ({ open: vi.fn(), push: vi.fn(), isCurrent: vi.fn(() => true), orgExecute: vi.fn() }))
vi.mock('~/stores/delegatedRunsStore', async () => {
  const fake = await import('~/test-support/delegatedRunsFake')
  fake.ownRuns.openAll = true
  return { useDelegatedRunsStore: fake.fakeDelegatedRunsStore }
})
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRouter: () => ({ push: navigation.push }) }))
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ beginSelectionIntent: () => ({ isCurrent: navigation.isCurrent }) }) }))
vi.mock('~/composables/useWorkspaceHistorySubjectActions', () => ({ useWorkspaceHistorySubjectActions: () => ({ execute: navigation.orgExecute }) }))
vi.mock('~/services/workspace/workspaceNavigationService', () => ({ openWorkspaceExecutionLink: navigation.open,
  buildWorkspaceExecutionRoute: (link: { kind: string; runId?: string; teamRunId?: string }) => `/workspace/${link.kind}/${link.runId ?? link.teamRunId}` }))

import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useTaskRootNavigation } from '../useTaskRootNavigation'

const root = (overrides: Partial<TaskRootView>): TaskRootView => ({
  kind: 'agent', recipientAddress: '/helper', ingressAgentRunId: 'nested-helper', teamRunId: null,
  delegatingRun: { kind: 'agent_team', runId: teamId(1) }, topRun: { kind: 'agent', runId: 'host-run' },
  start: 'started', startError: null, closed: false, status: 'running', ...overrides,
})
/** The manager's view: three task Teams; the second's designer delegated a helper Agent, a worker two hops down. */
const managerView = () => {
  const view = multiTeamView(3)
  const team = view.execution_tree.taskExecutions[1] as unknown as { taskExecutions: unknown[] }
  team.taskExecutions.push({ address: '/helper', agentRunId: 'nested-helper', platformAgentRunId: null, delegatorAgentRunId: memberId(1, 0),
    startedAt: created, source: { kind: 'agent', agentDefinitionId: 'helper', launchConfiguration: launch } })
  return view
}

beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  navigation.isCurrent.mockReturnValue(true); navigation.open.mockResolvedValue({ disposition: 'committed' })
  useAgentRunCollaborationStore().contexts = { 'host-run': shallowReactive(buildMultiTeamContext(managerView())) }
})

describe('useTaskRootNavigation (SR-080): the card opens its worker where its row lives', () => {
  it('a worker two hops down opens in its top run\'s view with its row revealed and selected, not in its delegator\'s', async () => {
    const store = useAgentRunCollaborationStore()
    await useTaskRootNavigation().open(root({}))
    expect(navigation.open).toHaveBeenCalledWith({ kind: 'agent', runId: 'host-run' }, expect.anything())
    expect(navigation.push).toHaveBeenCalledWith('/workspace/agent/host-run')
    // Its row is under the second Team: that Team expands (and only it), and the row is selected as a click selects it.
    expect([0, 1, 2].map((copy) => store.isTaskTeamExpanded('host-run', teamId(copy)))).toEqual([false, true, false])
    expect(store.taskRows('host-run').some((entry) => entry.row.agentRunId === 'nested-helper')).toBe(true)
    expect(store.selectedChild('host-run')).toBe('nested-helper')
  })

  it('PMU-003: a Team worker in an Agent top run opens its coordinator through its Team row, the Team expanded', async () => {
    const store = useAgentRunCollaborationStore()
    await useTaskRootNavigation().open(root({ kind: 'team', recipientAddress: '/software_engineering_team', teamRunId: teamId(2),
      ingressAgentRunId: memberId(2, 0), delegatingRun: { kind: 'agent', runId: 'host-run' } }))
    expect(store.isTaskTeamExpanded('host-run', teamId(2))).toBe(true)
    expect(store.selectedChild('host-run')).toBe(memberId(2, 0))
    expect(store.childTargetFor('host-run')).not.toBeNull()
  })

  it('a Team top opens on the worker as the Team\'s row does; an Org top through its inspect action', async () => {
    await useTaskRootNavigation().open(root({ topRun: { kind: 'agent_team', runId: 'team-top' }, ingressAgentRunId: 'reviewer-run' }))
    expect(navigation.open).toHaveBeenCalledWith({ kind: 'team', teamRunId: 'team-top', agentRunId: 'reviewer-run' }, expect.anything())
    await useTaskRootNavigation().open(root({ topRun: { kind: 'agent_org', runId: 'org-top' }, ingressAgentRunId: 'analyst-run' }))
    expect(navigation.orgExecute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-top', action: 'inspect', agentRunId: 'analyst-run' })
  })

  it('a worker whose delegator was deleted is its own top: it opens as its own run', async () => {
    await useTaskRootNavigation().open(root({ ingressAgentRunId: 'orphan', topRun: { kind: 'agent', runId: 'orphan' } }))
    expect(navigation.open).toHaveBeenCalledWith({ kind: 'agent', runId: 'orphan' }, expect.anything())
    expect(navigation.push).toHaveBeenCalledWith('/workspace/agent/orphan')
  })

  it('a root with no known top run opens nothing', async () => {
    await useTaskRootNavigation().open(root({ topRun: null }))
    expect(navigation.open).not.toHaveBeenCalled()
  })
})
