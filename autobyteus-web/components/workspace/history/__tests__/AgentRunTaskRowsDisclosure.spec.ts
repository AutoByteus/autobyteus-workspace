import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: vi.fn(async () => multiTeamView()),
  stageAgentRunCollaborationContext: vi.fn(async ({ view }) => ({ context: shallowReactive(buildMultiTeamContext(view)), commit: vi.fn() })),
}))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ getTeamMemberInspectionAttempt: () => null }) }))
// Summary lookup/Projects feed is a separate boundary, not the disclosure owner under test.
vi.mock('~/composables/projects/useTaskWorkerTasks', () => ({ useTaskWorkerTasks: () => ({ taskOf: () => null, locate: vi.fn() }) }))

import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import AgentRunTaskRows from '../AgentRunTaskRows.vue'

/** Actual row -> actual store -> actual context: unlike the selection-only mocked-store test. */
describe('AgentRunTaskRows independent Team disclosure', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
  const render = () => mount(AgentRunTaskRows, {
    props: { runId: 'host-run', label: 'Project Task Manager', runSelected: true, hasCollaboration: true },
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  const team = (wrapper: ReturnType<typeof render>, copy: number) => wrapper.findAll('[role="treeitem"][data-node-kind="agent_team"]')[copy]!
  const memberSelector = (copy: number, member: number) => `[role="treeitem"][data-agent-run-id="${memberId(copy, member)}"]`

  it('loads seven collapsed teams, reveals one via its button, and selects the exact member of a same-address copy', async () => {
    const wrapper = render(); await flushPromises()
    const store = useAgentRunCollaborationStore()
    expect(wrapper.findAll('[role="treeitem"]:not([aria-hidden="true"])')).toHaveLength(7)
    expect(wrapper.findAll('[data-test="workspace-team-transient-disclosure"]').map(button => button.attributes('aria-expanded'))).toEqual(Array(7).fill('false'))
    await team(wrapper, 4).get('button').trigger('click')
    expect(wrapper.findAll('[role="treeitem"]:not([aria-hidden="true"])')).toHaveLength(13)
    expect(wrapper.emitted('select-run')).toBeUndefined()
    expect(store.selectedChild('host-run')).toBeNull()
    expect(wrapper.find(memberSelector(3, 2)).exists()).toBe(false)
    await wrapper.get(memberSelector(4, 2)).trigger('click')
    expect(store.childTargetFor('host-run')).toMatchObject({ agentRunId: memberId(4, 2), address: '/software_engineering_team/implementation_engineer' })
    expect(wrapper.get(memberSelector(4, 2)).attributes('aria-selected')).toBe('true')
    expect(wrapper.emitted('select-run')).toHaveLength(1)
    await store.inspect('host-run'); await flushPromises()
    expect(wrapper.findAll('[role="treeitem"]:not([aria-hidden="true"])')).toHaveLength(13)
    await wrapper.setProps({ runSelected: false }); await wrapper.setProps({ runSelected: true })
    expect(team(wrapper, 4).attributes('aria-expanded')).toBe('true')
    await team(wrapper, 4).get('button').trigger('click')
    expect(wrapper.findAll('[role="treeitem"]:not([aria-hidden="true"])')).toHaveLength(7)
    expect(store.selectedChild('host-run')).toBe(memberId(4, 2))
    expect(team(wrapper, 3).attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it.each(['click', 'keydown.enter', 'keydown.space'])('Team body %s toggles only that Team and selects its coordinator', async (action) => {
    const wrapper = render(); await flushPromises()
    const store = useAgentRunCollaborationStore()
    await team(wrapper, 2).trigger(action)
    expect(store.selectedChild('host-run')).toBe(memberId(2, 0))
    expect(wrapper.findAll('[role="treeitem"]:not([aria-hidden="true"])')).toHaveLength(13)
    expect(team(wrapper, 1).attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('select-run')).toHaveLength(1)
    await team(wrapper, 2).trigger(action)
    expect(wrapper.findAll('[role="treeitem"]:not([aria-hidden="true"])')).toHaveLength(7)
    expect(store.childTargetFor('host-run')?.agentRunId).toBe(memberId(2, 0))
    wrapper.unmount()
  })
})
