import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspaceTransientExecutionRow from '../WorkspaceTransientExecutionRow.vue'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'

const liveness = vi.hoisted(() => ({ live: new Set<string>() }))
vi.mock('~/services/runConfigEditing/delegatedCopyLiveness', () => ({
  isDelegatedCopyLive: (_root: unknown, reference: { agentRunId?: string; teamRunId?: string }) =>
    liveness.live.has(reference.agentRunId ?? reference.teamRunId ?? ''),
}))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

/** DS-002 (SR-007): a running copy or collaborator row in the sidebar has the same stop icon as a running run. */
const root = { rootKind: 'AGENT_TEAM' as const, rootRunId: 'root' }
const row = (overrides: Partial<RunHistoryTransientExecutionRow> = {}): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution', transientKind: 'task_agent', rowKey: 'agent:worker-run', teamRunId: 'root',
  memberAddress: '/writer', agentRunId: 'worker-run', teamRunIdForNode: null, memberKind: 'agent',
  displayName: 'writer', currentStatus: AgentStatus.Running, delegatedBy: 'pm', depth: 0, hasChildren: false, ...overrides,
})

beforeEach(() => { setActivePinia(createPinia()); liveness.live.clear() })

describe('sidebar copy rows: per-copy Stop', () => {
  it('shows the stop icon on a running copy and stops exactly that copy without opening the row', async () => {
    liveness.live.add('worker-run')
    const store = useDelegatedLaunchDraftStore()
    const stop = vi.spyOn(store, 'stop').mockResolvedValue(true)
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: row(), stopRoot: root } })
    await wrapper.get('[data-test="workspace-delegated-stop"]').trigger('click')
    expect(stop).toHaveBeenCalledWith(root, { agentRunId: 'worker-run' })
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('stops a whole Team copy from its row, never one member of it; a stopped copy shows no icon', () => {
    liveness.live.add('review-team').add('member-run')
    const team = mount(WorkspaceTransientExecutionRow, { props: { stopRoot: root, row: row({
      transientKind: 'task_team', agentRunId: null, teamRunIdForNode: 'review-team', memberKind: 'agent_team', rowKey: 'team:review-team',
    }) } })
    expect(team.find('[data-test="workspace-delegated-stop"]').exists()).toBe(true)
    const member = mount(WorkspaceTransientExecutionRow, { props: { stopRoot: root, row: row({ transientKind: 'task_team_child', agentRunId: 'member-run' }) } })
    expect(member.find('[data-test="workspace-delegated-stop"]').exists()).toBe(false)
    const stopped = mount(WorkspaceTransientExecutionRow, { props: { stopRoot: root, row: row({ agentRunId: 'idle-run' }) } })
    expect(stopped.find('[data-test="workspace-delegated-stop"]').exists()).toBe(false)
    const noRoot = mount(WorkspaceTransientExecutionRow, { props: { row: row() } })
    expect(noRoot.find('[data-test="workspace-delegated-stop"]').exists()).toBe(false)
  })
})
