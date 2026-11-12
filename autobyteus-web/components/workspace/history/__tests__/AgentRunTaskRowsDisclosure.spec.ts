import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowReactive } from 'vue'
import { buildMultiTeamContext, memberId, multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: vi.fn(async () => multiTeamView()),
  buildAgentRunCollaborationContext: vi.fn(async ({ view }) => shallowReactive(buildMultiTeamContext(view))),
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationChildHydration', () => ({ hubChildLoadTarget: vi.fn(() => null) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ getTeamMemberInspectionAttempt: () => null, applyRunNavigationEffect: vi.fn() }) }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
// Summary lookup/Projects feed is a separate boundary, not the disclosure owner under test.
vi.mock('~/composables/projects/useTaskWorkerTasks', () => ({ useTaskWorkerTasks: () => ({ taskOf: () => null, locate: vi.fn() }) }))

import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import AgentRunTaskRows from '../AgentRunTaskRows.vue'

class Socket {
  static OPEN = 1; readyState = 1
  onmessage?: (event: { data: string }) => void
  send = vi.fn(); close = vi.fn()
  constructor(_url: string) { sockets.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
const sockets: Socket[] = []

/**
 * Actual row -> actual store -> actual context: unlike the selection-only mocked-store test. The run is open (its view's
 * stream, autobyteus-461 SR-055): a Team row selects its coordinator through the view.
 */
describe('AgentRunTaskRows independent Team disclosure', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); sockets.length = 0; vi.stubGlobal('WebSocket', Socket) })
  const render = () => {
    useAgentRunCollaborationStore().attach('host-run')
    sockets[0]!.frame({ type: 'CONNECTED', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', session_id: 'session' } })
    sockets[0]!.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: multiTeamView() } })
    return mount(AgentRunTaskRows, {
      props: { runId: 'host-run', label: 'Project Task Manager', runSelected: true },
      global: { stubs: { transition: false, 'transition-group': false } },
    })
  }
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
    const child = store.childTargetFor('host-run')
    expect(child?.kind).toBe('agent_run_task_team_member')
    expect(child && 'agentRunId' in child ? child.agentRunId : null).toBe(memberId(2, 0))
    wrapper.unmount()
  })
})
