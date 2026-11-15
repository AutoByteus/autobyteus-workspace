import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({
  useAgentRunCollaborationStore: () => ({
    ensureStoredView: vi.fn(), selectedRowKey: () => null, isTreeRowExpanded: () => false, toggleTreeRow: vi.fn(), selectTreeRow: vi.fn(() => true),
  }),
}))
vi.mock('~/stores/runStatusStore', () => ({ useRunStatusStore: () => ({
  hold: () => () => undefined, treeRevisionOf: () => 0, isRunLive: () => false, statusOf: () => 'idle', runStateOf: () => null }) }))

import AgentRunTaskRows from '../AgentRunTaskRows.vue'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { agentRow } from '~/test-support/runTreeFixtures'

// The run's tree as its open view's stream feeds it (SR-084): its own agent and the delegated agents under it.
const HOST = 'host-run'
const showRows = (...agentRunIds: string[]) => useRunTreeStore().streamSnapshot({ kind: 'agent', runId: HOST },
  [agentRow(HOST, null, 0), ...agentRunIds.map((agentRunId) => agentRow(agentRunId, `agent:${HOST}`, 1))])
const frames = async () => {
  for (let index = 0; index < 4; index += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  await flushPromises()
}

/** CR-001 (REQ-002, REQ-009): the last task rows of a run leave through the transition, not with the tree. */
describe('AgentRunTaskRows leave motion with a real TransitionGroup', () => {
  beforeEach(() => { setActivePinia(createPinia()); showRows('writer-run') })
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

    showRows()
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
    showRows('writer-run', 'other-run')
    const wrapper = mountTree()
    showRows('other-run')
    await nextTick()
    await frames()
    expect(wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')).toHaveLength(1)
    showRows()
    await nextTick()
    await frames()
    expect(wrapper.find('[data-test="workspace-agent-run-task-tree"]').exists()).toBe(false)
    showRows('new-run')
    await nextTick()
    expect(wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')).toHaveLength(1)
  })
})
