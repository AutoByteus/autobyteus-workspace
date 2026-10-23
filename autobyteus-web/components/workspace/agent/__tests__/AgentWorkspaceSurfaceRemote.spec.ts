import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgentWorkspaceSurface from '../AgentWorkspaceSurface.vue'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: vi.fn(() => null) }) }))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

/** autobyteus-278 UIS-002 / UIS-005: an opened remote run has its node beside its name, no ⚙ or ＋, and a notice when unreachable. */

const execution = {
  kind: 'agent' as const, address: '/market_researcher', agent_run_id: 'researcher-run', node_id: 'srv_docker', node_name: 'docker',
  delegator_agent_run_id: 'manager-run', started_at: '2026-10-23T08:00:00.000Z',
}
const mountFor = (runId: string) => mount(AgentWorkspaceSurface, {
  props: {
    showHeaderActions: true,
    target: {
      kind: 'agent_run_task_agent', host: { hostRunId: 'manager-run' }, address: '/market_researcher',
      context: { config: { agentDefinitionId: '', agentDefinitionName: 'market researcher', agentAvatarUrl: null },
        state: { runId, currentStatus: 'idle', conversation: { messages: [] }, eventMonitorPresentationRevision: 0, hasEarlierActiveTraceEvents: false } },
      browse: { kind: 'standaloneMember', hostRunId: 'manager-run', memberAddress: '/market_researcher', agentRunId: runId },
    } as never,
  },
  global: { stubs: { AgentEventMonitor: true, AgentStatusDisplay: true, WorkspaceHeaderActions: { template: '<div data-test="header-actions" />' },
    WorkspaceRecoveryNotice: true } },
})

describe('AgentWorkspaceSurface for a run another node runs', () => {
  let retry: ReturnType<typeof vi.fn>
  beforeEach(() => {
    setActivePinia(createPinia())
    retry = vi.fn(() => true)
    useRemoteRunsStore().register(execution, retry)
  })

  it('shows the node chip in the header and no ⚙ or ＋; a local run keeps its header actions', () => {
    const remote = mountFor('researcher-run')
    expect(remote.get('[data-test="remote-node-chip"]').attributes('aria-label')).toBe('Runs on docker')
    expect(remote.find('[data-test="header-actions"]').exists()).toBe(false)
    expect(remote.find('[data-test="remote-run-notice"]').exists()).toBe(false)
    const local = mountFor('local-run')
    expect(local.find('[data-test="remote-node-chip"]').exists()).toBe(false)
    expect(local.find('[data-test="header-actions"]').exists()).toBe(true)
  })

  it("shows the red notice with Retry when the node did not answer", async () => {
    useRemoteRunsStore().markReachable('researcher-run', false)
    const wrapper = mountFor('researcher-run')
    const notice = wrapper.get('[data-test="remote-run-notice"]')
    expect(notice.attributes('role')).toBe('alert')
    expect(notice.text()).toContain("docker isn't reachable")
    await wrapper.get('[data-test="remote-run-notice-retry"]').trigger('click')
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
