import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const row = (agentRunId: string): RunHistoryTransientExecutionRow => ({ kind: 'transient_execution', transientKind: 'task_agent', rowKey: `agent:${agentRunId}`,
  teamRunId: 'host-run', memberAddress: `/${agentRunId}`, agentRunId, teamRunIdForNode: null, memberKind: 'agent', displayName: agentRunId,
  currentStatus: AgentStatus.Idle, delegatedBy: 'manager', depth: 0, hasChildren: false })

/** F-006: a task row opens its conversation from any page, also when its run is already the selected run. */
describe('AgentRunTaskRows selection', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); collaboration.rows = [{ row: row('writer-run'), continuingAncestorDepths: [], hasFollowingSibling: false }] })

  it.each([true, false])('selects the task agent and (re)opens its run when runSelected=%s', async (runSelected) => {
    const wrapper = mount(AgentRunTaskRows, { props: { runId: 'host-run', label: 'Manager run', runSelected, hasCollaboration: true },
      global: { stubs: { transition: false, 'transition-group': false } } })
    await wrapper.get('[data-test="workspace-team-transient-execution-row"]').trigger('click')
    expect(collaboration.selectChild).toHaveBeenCalledWith('host-run', 'writer-run')
    expect(wrapper.emitted('select-run')).toHaveLength(1)
  })
})
