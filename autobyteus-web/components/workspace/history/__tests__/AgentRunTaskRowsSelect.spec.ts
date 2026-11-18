import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentStatus } from '~/types/agent/AgentStatus'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
const collaboration = vi.hoisted(() => ({ selectTreeRow: vi.fn(() => true), selected: null as string | null, expanded: false }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({
  useAgentRunCollaborationStore: () => ({
    ensureStoredView: vi.fn(), selectedRowKey: () => null, isTreeRowExpanded: () => collaboration.expanded, toggleTreeRow: vi.fn(),
    selectTreeRow: collaboration.selectTreeRow, selectedChild: () => collaboration.selected,
  }),
}))
// Each row's status is its own run's answer, by the ID the server named (SR-083, SR-086 G-A4).
const statuses = vi.hoisted(() => ({ agents: {} as Record<string, string>, runs: {} as Record<string, string> }))
vi.mock('~/stores/runStatusStore', () => ({ useRunStatusStore: () => ({
  hold: () => () => undefined, treeRevisionOf: () => 0, isRunLive: () => false, statusOf: (id: string) => statuses.agents[id] ?? null, backgroundTasksOf: () => 0,
  runStateOf: (ref: { runId: string }) => statuses.runs[ref.runId] ? { answer: 'ok', node: null, status: statuses.runs[ref.runId], backgroundTasksRunning: 0 } : null,
}) }))

import AgentRunTaskRows from '../AgentRunTaskRows.vue'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { agentRow, teamRows } from '~/test-support/runTreeFixtures'

// Dispose summary/feed watchers before Nuxt tears down the DOM environment.
enableAutoUnmount(afterEach)

const HOST = 'host-run'
const mountRows = (runSelected: boolean) => mount(AgentRunTaskRows, { props: { runId: HOST, label: 'Manager run', runSelected, hasCollaboration: true },
  global: { stubs: { transition: false, 'transition-group': false } } })

/** F-006, SR-084: a tree row opens where the server says, from any page, also when its run is already the selected run. */
describe('AgentRunTaskRows selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    collaboration.selected = null
    collaboration.expanded = false
    statuses.agents = {}
    statuses.runs = {}
    // The open view's stream fed the tree (SR-084): the run's own agent and one delegated agent.
    useRunTreeStore().streamSnapshot({ kind: 'agent', runId: HOST }, [agentRow(HOST, null, 0), agentRow('writer-run', `agent:${HOST}`, 1)])
  })

  it.each([true, false])('opens the row through openRunTarget and (re)opens its run when runSelected=%s', async (runSelected) => {
    const wrapper = mountRows(runSelected)
    await wrapper.get('[data-test="workspace-team-transient-execution-row"]').trigger('click')
    expect(collaboration.selectTreeRow).toHaveBeenCalledWith(HOST, expect.objectContaining({ key: 'agent:writer-run',
      openTarget: { runKind: 'agent', runId: 'writer-run', agentRunId: 'writer-run' } }))
    expect(wrapper.emitted('select-run')).toHaveLength(1)
  })

  it('opens nothing while the run\'s view is not loaded, or for a row error (the store selected nothing)', async () => {
    collaboration.selectTreeRow.mockReturnValueOnce(false)
    const wrapper = mountRows(false)
    await wrapper.get('[data-test="workspace-team-transient-execution-row"]').trigger('click')
    expect(wrapper.emitted('select-run')).toBeUndefined()
  })

  // delegated-team-aggregate-status REQ-005/006, AC-001; SR-086 G-A4: a Team row's status is its team run's own.
  it('shows a Team row its team run\'s own status (its root\'s, never folded here); an agent row its agent\'s', () => {
    useRunTreeStore().streamSnapshot({ kind: 'agent', runId: HOST }, [agentRow(HOST, null, 0),
      ...teamRows('review-team', `agent:${HOST}`, 1, ['review-lead', 'review-dev']), agentRow('writer-run', `agent:${HOST}`, 1)])
    statuses.runs['review-team'] = 'running'
    statuses.agents['review-lead'] = 'idle'
    statuses.agents['writer-run'] = 'idle'
    const wrapper = mountRows(false)
    const [team, agent] = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')
    expect(team!.get('[data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe(AgentStatus.Running)
    expect(agent!.find('[data-test="team-aggregate-status-dot"]').exists()).toBe(false)
    expect(agent!.find('[data-test="workspace-transient-status-dot"]').exists()).toBe(true)
  })
  // CR-461-108: the row that shows the opened agent is selected; a delegated Team opened at its coordinator marks the coordinator's row, not the Team row.
  it('marks the opened agent\'s row selected: the coordinator\'s row for a Team opened at it, never the Team row', () => {
    useRunTreeStore().streamSnapshot({ kind: 'agent', runId: HOST }, [agentRow(HOST, null, 0),
      ...teamRows('review-team', `agent:${HOST}`, 1, ['review-lead', 'review-dev'])])
    collaboration.selected = 'review-lead'
    collaboration.expanded = true
    const wrapper = mountRows(true)
    const selected = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]').filter((row) => row.attributes('aria-current') === 'true')
    expect(selected.map((row) => row.attributes('data-agent-run-id'))).toEqual(['review-lead'])
  })
})
