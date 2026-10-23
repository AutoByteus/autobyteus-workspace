import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: vi.fn(() => null) }) }))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

/**
 * autobyteus-278 REQ-808, REQ-806 (CRR-003 F-003): an opened run another node runs has the same view in every family,
 * from one owner (`useRemoteRunView`) in the two surfaces the families render: its node beside its name, no ⚙ or ＋,
 * the red notice with Retry while its node did not answer, and a box that names the node. A run of this node is
 * unchanged.
 */

const remoteTeam = {
  kind: 'agent_team' as const, address: '/studio_team', team_run_id: 'studio-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/studio_team/publisher', members: [{ address: '/studio_team/publisher', agent_run_id: 'publisher-run' }],
  delegator_agent_run_id: 'manager-run', started_at: '2026-10-23T08:00:00.000Z',
}
const context = (runId: string) => ({
  config: { agentDefinitionId: '', agentDefinitionName: 'publisher', agentAvatarUrl: null },
  state: { runId, currentStatus: 'idle', conversation: { messages: [] }, eventMonitorPresentationRevision: 0, hasEarlierActiveTraceEvents: false },
})
const collaborationMessages = { memberIdentityByAgentRunId: () => ({}) }
const team = { focusedMemberAddress: '/studio_team/publisher', teamDefinitionName: 'Studio Team' }
const stubs = { AgentEventMonitor: { props: ['composerPlaceholder'], template: '<div data-test="monitor" :data-placeholder="composerPlaceholder ?? \'\'" />' },
  AgentStatusDisplay: true, WorkspaceRecoveryNotice: true, WorkspaceHeaderActions: { template: '<div data-test="header-actions" />' } }

const families = [
  { family: 'standalone (a delegated Agent or a remote Team member)', surface: AgentWorkspaceSurface, kind: 'agent_run_task_team_member', local: 'Message publisher…' },
  { family: 'Org (a delegated Agent)', surface: AgentWorkspaceSurface, kind: 'agent_org_task_agent', local: null },
  { family: 'Team (a member of a Team the Team root delegated)', surface: TeamWorkspaceSurface, kind: 'standalone_team_member', local: null },
  { family: 'Org (a member of a delegated Team)', surface: TeamWorkspaceSurface, kind: 'agent_org_task_team_member', local: null },
] as const

const mountFor = (entry: typeof families[number], runId: string) => mount(entry.surface as never, {
  props: { showHeaderActions: true, composerPlaceholder: entry.local,
    target: { kind: entry.kind, context: context(runId), collaborationMessages, team, browse: null } as never },
  global: { stubs },
})

describe.each(families)('the $family view of a run another node runs', (entry) => {
  let retry: ReturnType<typeof vi.fn>
  beforeEach(() => {
    setActivePinia(createPinia())
    retry = vi.fn(() => true)
    useRemoteRunsStore().register(remoteTeam, retry)
  })

  it('shows the node beside the name, no ⚙ or ＋, and a box naming the node; a run of this node keeps all of them', () => {
    const remote = mountFor(entry, 'publisher-run')
    expect(remote.get('[data-test="remote-node-chip"]').attributes('aria-label')).toBe('Runs on docker')
    expect(remote.find('[data-test="header-actions"]').exists()).toBe(false)
    expect(remote.get('[data-test="monitor"]').attributes('data-placeholder')).toBe('Message publisher on docker…')
    const local = mountFor(entry, 'local-run')
    expect(local.find('[data-test="remote-node-chip"]').exists()).toBe(false)
    expect(local.find('[data-test="header-actions"]').exists()).toBe(true)
    expect(local.get('[data-test="monitor"]').attributes('data-placeholder')).toBe(entry.local ?? '')
  })

  it('shows the red notice with Retry while its node did not answer', async () => {
    const remote = mountFor(entry, 'publisher-run')
    expect(remote.find('[data-test="remote-run-notice"]').exists()).toBe(false)
    useRemoteRunsStore().markReachable('studio-run', false)
    await remote.vm.$nextTick()
    expect(remote.get('[data-test="remote-run-notice"]').attributes('role')).toBe('alert')
    await remote.get('[data-test="remote-run-notice-retry"]').trigger('click')
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
