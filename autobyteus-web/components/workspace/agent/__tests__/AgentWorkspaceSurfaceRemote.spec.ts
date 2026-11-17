import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgentWorkspaceSurface from '../AgentWorkspaceSurface.vue'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { peerAgentRow, seedPeerRows, type PeerAnswer } from '~/test-support/runTreeFixtures'

vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: vi.fn(() => null) }) }))
const feed = vi.hoisted(() => ({ retry: vi.fn((_runIds: readonly string[]) => true) }))
vi.mock('~/services/runStatus/runStatusFeed', () => ({
  RunStatusFeed: class { retry = feed.retry; hold() { return () => undefined } rebind() {} suspend() {} },
}))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

/**
 * autobyteus-278 UIS-002 / UIS-005: an opened remote run has its node beside its name, no ⚙ or ＋, and a notice when
 * unreachable; its node and answer are its tree row's `peer` (autobyteus-461 G-D1), its Retry goes over `/ws/run-status`.
 */
const seed = (answer: PeerAnswer = {}) => seedPeerRows(useRunTreeStore(), 'manager-run',
  [peerAgentRow('researcher-run', 'agent:manager-run', { nodeId: 'srv_docker', nodeName: 'docker', ...answer })])
const mountFor = (runId: string) => mount(AgentWorkspaceSurface, {
  props: {
    showHeaderActions: true,
    target: {
      kind: 'agent_run_task_agent', viewRun: { runId: 'manager-run' }, address: '/market_researcher',
      context: { config: { agentDefinitionId: '', agentDefinitionName: 'market researcher', agentAvatarUrl: null },
        state: { runId, currentStatus: 'idle', conversation: { messages: [] }, eventMonitorPresentationRevision: 0, hasEarlierActiveTraceEvents: false } },
      browse: { kind: 'peerRun', nodeId: 'srv_docker', runId, agentRunId: runId },
    } as never,
  },
  global: { stubs: { AgentEventMonitor: true, AgentStatusDisplay: true, WorkspaceHeaderActions: { template: '<div data-test="header-actions" />' },
    WorkspaceRecoveryNotice: true } },
})

describe('AgentWorkspaceSurface for a run another node runs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    feed.retry.mockClear()
    seed()
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
    seed({ reachable: false })
    const wrapper = mountFor('researcher-run')
    const notice = wrapper.get('[data-test="remote-run-notice"]')
    expect(notice.attributes('role')).toBe('alert')
    expect(notice.text()).toContain("docker isn't reachable")
    await wrapper.get('[data-test="remote-run-notice-retry"]').trigger('click')
    expect(feed.retry).toHaveBeenCalledExactlyOnceWith(['researcher-run'])
  })
})
