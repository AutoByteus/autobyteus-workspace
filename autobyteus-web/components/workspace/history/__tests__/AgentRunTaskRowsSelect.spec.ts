import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
const collaboration = vi.hoisted(() => ({ selectChild: vi.fn(), rows: [] as unknown[] }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({
  useAgentRunCollaborationStore: () => ({
    taskRows: () => collaboration.rows,
    contextFor: () => ({ index: { coordinatorOf: () => ({ agentRunId: 'lead-run' }) } }), inspect: vi.fn(), isTaskTeamExpanded: () => false,
    selectedChild: () => null, toggleTaskTeam: vi.fn(), selectChild: collaboration.selectChild,
  }),
}))

import AgentRunTaskRows from '../AgentRunTaskRows.vue'

// Dispose summary/feed watchers before Nuxt tears down the DOM environment.
enableAutoUnmount(afterEach)

const row = (agentRunId: string): RunHistoryTransientExecutionRow => ({ kind: 'transient_execution', transientKind: 'task_agent', rowKey: `agent:${agentRunId}`,
  teamRunId: 'host-run', memberAddress: `/${agentRunId}`, agentRunId, teamRunIdForNode: null, memberKind: 'agent', displayName: agentRunId,
  currentStatus: AgentStatus.Idle, delegatedBy: 'manager', depth: 0, hasChildren: false })

/** F-006: a task row opens its conversation from any page, also when its run is already the selected run. */
describe('AgentRunTaskRows selection', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); collaboration.rows = [{ row: row('writer-run'), teamStatus: null, continuingAncestorDepths: [], hasFollowingSibling: false }] })

  it.each([true, false])('selects the task agent and (re)opens its run when runSelected=%s', async (runSelected) => {
    const wrapper = mount(AgentRunTaskRows, { props: { runId: 'host-run', label: 'Manager run', runSelected, hasCollaboration: true },
      global: { stubs: { transition: false, 'transition-group': false } } })
    await wrapper.get('[data-test="workspace-team-transient-execution-row"]').trigger('click')
    expect(collaboration.selectChild).toHaveBeenCalledWith('host-run', 'writer-run')
    expect(wrapper.emitted('select-run')).toHaveLength(1)
  })

  // delegated-team-aggregate-status REQ-005/006, AC-001: the context's Team status reaches the delegated Team row.
  it('passes each task Team row its Team status; agent rows keep their own dot', () => {
    const teamRow: RunHistoryTransientExecutionRow = { ...row('unused'), transientKind: 'task_team', rowKey: 'team:review-team',
      agentRunId: null, teamRunIdForNode: 'review-team', memberKind: 'agent_team', displayName: 'review team', currentStatus: null, hasChildren: true }
    collaboration.rows = [
      { row: teamRow, teamStatus: AgentStatus.Running, continuingAncestorDepths: [], hasFollowingSibling: true },
      { row: row('writer-run'), teamStatus: null, continuingAncestorDepths: [], hasFollowingSibling: false },
    ]
    const wrapper = mount(AgentRunTaskRows, { props: { runId: 'host-run', label: 'Manager run', runSelected: false, hasCollaboration: true },
      global: { stubs: { transition: false, 'transition-group': false } } })
    const [team, agent] = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')
    expect(team!.get('[data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe(AgentStatus.Running)
    expect(agent!.find('[data-test="team-aggregate-status-dot"]').exists()).toBe(false)
    expect(agent!.find('[data-test="workspace-transient-status-dot"]').exists()).toBe(true)
  })
})
