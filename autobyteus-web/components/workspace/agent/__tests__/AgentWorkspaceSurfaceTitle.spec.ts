import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgentWorkspaceSurface from '../AgentWorkspaceSurface.vue'

vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: vi.fn(() => null) }) }))
vi.mock('~/services/runStatus/runStatusFeed', () => ({
  RunStatusFeed: class { retry() { return true } hold() { return () => undefined } rebind() {} suspend() {} },
}))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

const mountFor = (target: Record<string, unknown>) => mount(AgentWorkspaceSurface, {
  props: {
    showHeaderActions: true,
    target: {
      context: { config: { agentDefinitionId: 'writer-def', agentDefinitionName: 'writer', agentAvatarUrl: null },
        state: { runId: 'writer-run-e997', currentStatus: 'idle', conversation: { messages: [] }, eventMonitorPresentationRevision: 0, hasEarlierActiveTraceEvents: false } },
      browse: { kind: 'run', runId: 'writer-run-e997' },
      ...target,
    } as never,
  },
  global: { stubs: { AgentEventMonitor: true, AgentStatusDisplay: true, WorkspaceHeaderActions: true, WorkspaceRecoveryNotice: true } },
})

/**
 * autobyteus-461 CR-461-115 (SR-091): a delegated run opened in the view of the run that delegated it, an Agent run's or an
 * Org's, is titled by its name alone, as its row names it; never "<name> - <run suffix>".
 */
describe('AgentWorkspaceSurface title of a delegated run', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('a run the Org delegated, opened in the Org, reads its name, as one an Agent run delegated does', () => {
    expect(mountFor({ kind: 'agent_org_task_agent', root: { orgRunId: 'org-run' }, address: '/writer' })
      .get('[data-test="agent-workspace-title"]').text()).toBe('writer')
    expect(mountFor({ kind: 'agent_run_task_agent', viewRun: { runId: 'manager-run' }, address: '/writer' })
      .get('[data-test="agent-workspace-title"]').text()).toBe('writer')
  })
})
