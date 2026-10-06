import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
const rows = vi.hoisted(() => ({ value: null as unknown as import('vue').Ref<unknown[]> }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({
  useAgentRunCollaborationStore: () => ({
    taskRows: () => rows.value.value,
    contextFor: () => ({}), inspect: vi.fn(), isTaskTeamExpanded: () => false, selectedChild: () => null,
    toggleTaskTeam: vi.fn(), selectChild: vi.fn(),
  }),
}))

import AgentRunTaskRows from '../AgentRunTaskRows.vue'

const row = (agentRunId: string): { row: RunHistoryTransientExecutionRow; continuingAncestorDepths: number[]; hasFollowingSibling: boolean } => ({
  row: { kind: 'transient_execution', transientKind: 'task_agent', rowKey: `agent:${agentRunId}`, teamRunId: 'host-run',
    memberAddress: `/${agentRunId}`, agentRunId, teamRunIdForNode: null, memberKind: 'agent', displayName: agentRunId,
    currentStatus: AgentStatus.Idle, delegatedBy: 'manager', depth: 0, hasChildren: false },
  continuingAncestorDepths: [], hasFollowingSibling: false,
})
const frames = async () => {
  for (let index = 0; index < 4; index += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  await flushPromises()
}

/** CR-001 (REQ-002, REQ-009): the last task rows of a run leave through the transition, not with the tree. */
describe('AgentRunTaskRows leave motion with a real TransitionGroup', () => {
  beforeEach(() => { setActivePinia(createPinia()); rows.value = ref([row('writer-run')]) })
  afterEach(() => { document.body.innerHTML = '' })

  const mountTree = () => mount(defineComponent({
    setup: () => () => h('div', [
      h('button', { 'data-test': 'run-row' }, 'Manager run'),
      h(AgentRunTaskRows, { runId: 'host-run', label: 'Manager run', runSelected: true, hasCollaboration: true }),
    ]),
  }), { attachTo: document.body, global: { stubs: { transition: false, 'transition-group': false } } })

  it('runs the leave hooks for the only row, moves its focus to the run row, then stops rendering the empty tree', async () => {
    const wrapper = mountTree()
    const leaving = wrapper.get('[data-test="workspace-team-transient-execution-row"]').element as HTMLElement
    leaving.focus()
    expect(document.activeElement).toBe(leaving)

    rows.value.value = []
    await nextTick()
    // The tree is still mounted while the row leaves: out of the accessibility tree and inert at once.
    expect(wrapper.find('[data-test="workspace-agent-run-task-tree"]').exists()).toBe(true)
    expect(leaving.getAttribute('aria-hidden')).toBe('true')
    expect(leaving.inert).toBe(true)
    expect(document.activeElement).toBe(wrapper.get('[data-test="run-row"]').element)

    await frames()
    expect(wrapper.find('[data-test="workspace-agent-run-task-tree"]').exists()).toBe(false)
  })

  it('shows the tree again when a new row appears, and keeps it while other rows remain', async () => {
    rows.value.value = [row('writer-run'), row('other-run')]
    const wrapper = mountTree()
    rows.value.value = [row('other-run')]
    await nextTick()
    await frames()
    expect(wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')).toHaveLength(1)
    rows.value.value = []
    await nextTick()
    await frames()
    expect(wrapper.find('[data-test="workspace-agent-run-task-tree"]').exists()).toBe(false)
    rows.value.value = [row('new-run')]
    await nextTick()
    expect(wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')).toHaveLength(1)
  })
})
