import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, multiTeamView, teamId } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'
import type { TaskRootView } from '~/types/project'

/**
 * autobyteus-461 CR-461-076 (F-54), SR-080: the Task card opens its worker where its row lives, the view of the top of its
 * tree, as clicking that row does: the row selected there, so the worker opens as its own run (rule 2).
 */
const navigation = vi.hoisted(() => ({ open: vi.fn(), push: vi.fn(), orgExecute: vi.fn(),
  selection: { issued: 0, current: 0, selectedType: null as string | null, selectedRunId: null as string | null } }))
vi.mock('~/stores/delegatedRunsStore', async () => {
  const fake = await import('~/test-support/delegatedRunsFake')
  fake.ownRuns.openAll = true
  return { useDelegatedRunsStore: fake.fakeDelegatedRunsStore }
})
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRouter: () => ({ push: navigation.push }) }))
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({
  beginSelectionIntent: () => {
    const token = ++navigation.selection.issued
    navigation.selection.current = token
    return { isCurrent: () => navigation.selection.current === token }
  },
  get selectedType() { return navigation.selection.selectedType },
  get selectedRunId() { return navigation.selection.selectedRunId },
}) }))
vi.mock('~/composables/useWorkspaceHistorySubjectActions', () => ({ useWorkspaceHistorySubjectActions: () => ({ execute: navigation.orgExecute }) }))
vi.mock('~/services/workspace/workspaceNavigationService', () => ({ openWorkspaceExecutionLink: navigation.open,
  buildWorkspaceExecutionRoute: (link: { kind: string; runId?: string; teamRunId?: string }) => `/workspace/${link.kind}/${link.runId ?? link.teamRunId}` }))

import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { multiTeamTree } from '~/test-support/runTreeFixtures'
import { useTaskRootNavigation } from '../useTaskRootNavigation'

const root = (overrides: Partial<TaskRootView>): TaskRootView => ({
  kind: 'agent', recipientAddress: '/helper', displayName: 'helper', ingressAgentRunId: 'nested-helper', teamRunId: null,
  delegatingRun: { kind: 'agent_team', runId: teamId(1) }, topRun: { kind: 'agent', runId: 'host-run' },
  openTarget: { runKind: 'agent', runId: 'nested-helper', agentRunId: 'nested-helper' }, start: 'started', startError: null, closed: false, status: 'running', ...overrides,
})
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  Object.assign(navigation.selection, { issued: 0, current: 0, selectedType: null, selectedRunId: null })
  // Opening an Agent run selects it; on the Workspace page that moves to its chat, and the page's leave ends every
  // selection intent (`useWorkspaceRouteSelection`), the opener's too.
  navigation.open.mockImplementation(async (link: { kind: string; runId?: string }) => {
    if (link.kind === 'agent') Object.assign(navigation.selection, { selectedType: 'agent', selectedRunId: link.runId, current: 0 })
    return { disposition: 'committed' }
  })
  useAgentRunCollaborationStore().contexts = { 'host-run': shallowReactive(buildMultiTeamContext(multiTeamView(3))) }
  // The manager's tree as the server builds it (SR-084): the helper under the second Team's designer, two hops down.
  useRunTreeStore().streamSnapshot({ kind: 'agent', runId: 'host-run' }, [...multiTeamTree(3).rows, { key: 'agent:nested-helper',
    parentKey: `team_member:${teamId(1)}:${memberId(1, 0)}`, depth: 3, kind: 'agent', name: 'helper', address: '/helper',
    openTarget: { runKind: 'agent', runId: 'nested-helper', agentRunId: 'nested-helper' }, statusIds: ['nested-helper'] }])
})
const teamRow = (copy: number) => multiTeamTree(3).rows.find((row) => row.key === `team:${teamId(copy)}`)!

describe('useTaskRootNavigation (SR-080): the card opens its worker where its row lives', () => {
  it('a worker two hops down opens in its top run\'s view with its row revealed and selected, not in its delegator\'s', async () => {
    const store = useAgentRunCollaborationStore()
    await useTaskRootNavigation().open(root({}))
    expect(navigation.open).toHaveBeenCalledWith({ kind: 'agent', runId: 'host-run' }, expect.anything())
    expect(navigation.push).toHaveBeenCalledWith('/workspace/agent/host-run')
    // Its row is under the second Team: that Team unfolds (and only it), and the row is opened as a click opens it.
    expect([0, 1, 2].map((copy) => store.isTreeRowExpanded('host-run', teamRow(copy)))).toEqual([false, true, false])
    expect(store.selectedRowKey('host-run')).toBe('agent:nested-helper')
    expect(store.selectedChild('host-run')).toBe('nested-helper')
  })

  it('PMU-003: a Team worker in an Agent top run opens its coordinator through its Team row, the Team expanded', async () => {
    const store = useAgentRunCollaborationStore()
    await useTaskRootNavigation().open(root({ kind: 'team', recipientAddress: '/software_engineering_team', teamRunId: teamId(2),
      ingressAgentRunId: memberId(2, 0), delegatingRun: { kind: 'agent', runId: 'host-run' },
      openTarget: { runKind: 'agent_team', runId: teamId(2), agentRunId: memberId(2, 0) } }))
    // Its row is the Team's (the server's target is the Team at its coordinator): opened as a click on it opens it.
    expect(store.selectedRowKey('host-run')).toBe(`team:${teamId(2)}`)
    expect(store.selectedChild('host-run')).toBe(memberId(2, 0))
    expect(store.childTargetFor('host-run')).not.toBeNull()
  })

  describe('CR-461-102: a Team top', () => {
    // The Team's tree as the server builds it: its lead, an agent and a Team it delegated under the lead.
    const seedTeamTree = () => useRunTreeStore().streamSnapshot({ kind: 'agent_team', runId: 'team-top' }, [
      { key: 'team:team-top', parentKey: null, depth: 0, kind: 'team', name: 'team', address: '/team',
        openTarget: { runKind: 'agent_team', runId: 'team-top', agentRunId: 'lead-run' }, statusIds: ['team-top'] },
      { key: 'team_member:team-top:lead-run', parentKey: 'team:team-top', depth: 1, kind: 'team_member', name: 'lead', address: '/team/lead',
        openTarget: { runKind: 'agent_team', runId: 'team-top', agentRunId: 'lead-run' }, statusIds: ['lead-run'] },
      { key: 'agent:reviewer-run', parentKey: 'team_member:team-top:lead-run', depth: 2, kind: 'agent', name: 'reviewer', address: '/reviewer',
        openTarget: { runKind: 'agent', runId: 'reviewer-run', agentRunId: 'reviewer-run' }, statusIds: ['reviewer-run'] },
      { key: 'team:sub-team', parentKey: 'team_member:team-top:lead-run', depth: 2, kind: 'team', name: 'sub team', address: '/sub_team',
        openTarget: { runKind: 'agent_team', runId: 'sub-team', agentRunId: 'sub-lead' }, statusIds: ['sub-team'] },
    ])

    it('an agent worker the Team delegated opens the Team, then its own row (its own run, rule 2), not a member of the Team', async () => {
      seedTeamTree()
      await useTaskRootNavigation().open(root({ topRun: { kind: 'agent_team', runId: 'team-top' }, ingressAgentRunId: 'reviewer-run',
        openTarget: { runKind: 'agent', runId: 'reviewer-run', agentRunId: 'reviewer-run' } }))
      expect(navigation.open).toHaveBeenCalledWith({ kind: 'team', teamRunId: 'team-top', agentRunId: null }, expect.anything())
      expect(useAgentTeamContextsStore().delegatedRows['team-top']?.key).toBe('agent:reviewer-run')
    })

    it('a Team worker the Team delegated opens by its Team row, at its coordinator', async () => {
      seedTeamTree()
      await useTaskRootNavigation().open(root({ kind: 'team', topRun: { kind: 'agent_team', runId: 'team-top' }, teamRunId: 'sub-team',
        ingressAgentRunId: 'sub-lead', openTarget: { runKind: 'agent_team', runId: 'sub-team', agentRunId: 'sub-lead' } }))
      expect(navigation.open).toHaveBeenCalledWith({ kind: 'team', teamRunId: 'team-top', agentRunId: null }, expect.anything())
      expect(useAgentTeamContextsStore().delegatedRows['team-top']?.key).toBe('team:sub-team')
    })

    it("a member of the Team itself is focused in it, as before; no delegated row is selected", async () => {
      seedTeamTree()
      await useTaskRootNavigation().open(root({ topRun: { kind: 'agent_team', runId: 'team-top' }, ingressAgentRunId: 'lead-run',
        openTarget: { runKind: 'agent_team', runId: 'team-top', agentRunId: 'lead-run' } }))
      expect(navigation.open).toHaveBeenCalledWith({ kind: 'team', teamRunId: 'team-top', agentRunId: 'lead-run' }, expect.anything())
      expect(useAgentTeamContextsStore().delegatedRows['team-top'] ?? null).toBeNull()
    })
  })

  it('an Org top opens its worker through its inspect action', async () => {
    await useTaskRootNavigation().open(root({ topRun: { kind: 'agent_org', runId: 'org-top' }, ingressAgentRunId: 'analyst-run',
      openTarget: { runKind: 'agent', runId: 'analyst-run', agentRunId: 'analyst-run' } }))
    expect(navigation.orgExecute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-top', action: 'inspect', agentRunId: 'analyst-run' })
  })

  it('a worker whose delegator was deleted is its own top: it opens as its own run', async () => {
    await useTaskRootNavigation().open(root({ ingressAgentRunId: 'orphan', topRun: { kind: 'agent', runId: 'orphan' },
      openTarget: { runKind: 'agent', runId: 'orphan', agentRunId: 'orphan' } }))
    expect(navigation.open).toHaveBeenCalledWith({ kind: 'agent', runId: 'orphan' }, expect.anything())
    expect(navigation.push).toHaveBeenCalledWith('/workspace/agent/orphan')
  })

  it('F-59: opened from the Workspace page, whose leave ends the card\'s intent, the row is still selected', async () => {
    const store = useAgentRunCollaborationStore()
    await useTaskRootNavigation().open(root({}))
    expect(navigation.selection.selectedRunId).toBe('host-run')
    expect(store.selectedChild('host-run')).toBe('nested-helper')
  })

  it('a run the user selects while the card\'s run opens wins: no row of the card\'s run is selected', async () => {
    const store = useAgentRunCollaborationStore()
    navigation.push.mockImplementationOnce(async () => { Object.assign(navigation.selection, { selectedRunId: 'other-run' }) })
    await useTaskRootNavigation().open(root({}))
    expect(store.selectedChild('host-run')).toBeNull()
  })

  it('a root with no known top run opens nothing', async () => {
    await useTaskRootNavigation().open(root({ topRun: null }))
    expect(navigation.open).not.toHaveBeenCalled()
  })
})
