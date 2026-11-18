import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunHistoryTeamExecutionRow, RunHistoryDelegatedRunRow, TeamTreeNode } from '~/stores/runHistoryTypes'
import type { TaskWorkerRef, TaskWorkerTask } from '~/types/project'
import { AgentStatus } from '~/types/agent/AgentStatus'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({
  useAgentRunCollaborationStore: () => ({
    ensureStoredView: vi.fn(), isTreeRowExpanded: () => true, selectedRowKey: () => null, toggleTreeRow: vi.fn(), selectTreeRow: vi.fn(() => true),
  }),
}))

import AgentRunTaskRows from '../AgentRunTaskRows.vue'
import WorkspaceTeamExecutionTree from '../WorkspaceTeamExecutionTree.vue'
import { useTaskWorkerTaskStore } from '~/stores/taskWorkerTaskStore'
import { useTaskLocatorStore } from '~/stores/taskLocatorStore'
import { useRunTreeStore } from '~/stores/runTreeStore'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'

const transient = (delegatedRunKind: RunHistoryDelegatedRunRow['delegatedRunKind'], id: string, depth = 0): RunHistoryDelegatedRunRow => ({
  kind: 'delegated_run', delegatedRunKind, rowKey: `${delegatedRunKind}:${id}`, teamRunId: 'host-run', memberAddress: `/${id}`,
  agentRunId: delegatedRunKind === 'task_team' ? null : id, teamRunIdForNode: delegatedRunKind === 'task_team' ? id : null,
  memberKind: delegatedRunKind === 'task_team' ? 'agent_team' : 'agent', displayName: id, currentStatus: AgentStatus.Idle,
  delegatedBy: null, depth, hasChildren: delegatedRunKind === 'task_team',
})
const workerRow = transient('task_agent', 'writer-run')
const teamCopyRow = transient('task_team', 'review-team')
const memberRow = transient('task_team_child', 'reviewer-run', 1)
const collaboratorRow = transient('task_agent', 'collaborator-run')
const task = (taskId: string): TaskWorkerTask => ({ taskId, projectId: null, title: null, description: `Task ${taskId}`, status: 'TODO' })
/** The server's answers: workers have a Task; the `@` collaborator is no Task's root (null). */
const answers: Record<string, TaskWorkerTask | null> = { 'agent:writer-run': task('t-writer'), 'team:review-team': task('t-team'), 'agent:collaborator-run': null }

const summaries = (wrapper: ReturnType<typeof mount>) => Object.fromEntries(wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')
  .map((row) => [row.attributes('data-member-address'), row.find('[data-test="workspace-task-worker-task-summary"]').exists() ? row.find('[data-test="workspace-task-worker-task-summary"]').text() : null]))

describe('Task summaries under Agent-run and Team-run hosts (delegated-copy-task-locator DS-001, DS-004)', () => {
  let retained: TaskWorkerRef[][]
  beforeEach(() => {
    setActivePinia(createPinia())
    retained = []
    const store = useTaskWorkerTaskStore()
    vi.spyOn(store, 'retain').mockImplementation((workers) => { retained.push([...workers]); return () => undefined })
    vi.spyOn(store, 'taskOf').mockImplementation((worker) => answers[worker.kind === 'agent' ? `agent:${worker.agentRunId}` : `team:${worker.teamRunId}`])
  })

  const mountAgentHost = () => {
    // The Agent run's tree as the server builds it (SR-084): its own agent, a worker, a Team copy with a member, a collaborator.
    const agent = (id: string, parentKey: string, depth: number): RunTreeRowDto => ({ key: `agent:${id}`, parentKey, depth, kind: 'agent', name: id,
      address: `/${id}`, openTarget: { runKind: 'agent', runId: id, agentRunId: id }, statusIds: [id] })
    useRunTreeStore().streamSnapshot({ kind: 'agent', runId: 'host-run' }, [
      agent('host-run', null as never, 0), agent('writer-run', 'agent:host-run', 1),
      { key: 'team:review-team', parentKey: 'agent:host-run', depth: 1, kind: 'team', name: 'review-team', address: '/review-team',
        openTarget: { runKind: 'agent_team', runId: 'review-team', agentRunId: 'reviewer-run' }, statusIds: ['review-team'] },
      { key: 'team_member:review-team:reviewer-run', parentKey: 'team:review-team', depth: 2, kind: 'team_member', name: 'reviewer-run', address: '/reviewer-run',
        openTarget: { runKind: 'agent_team', runId: 'review-team', agentRunId: 'reviewer-run' }, statusIds: ['reviewer-run'] },
      agent('collaborator-run', 'agent:host-run', 1),
    ])
    return mount(AgentRunTaskRows, { props: { runId: 'host-run', label: 'Manager run', runSelected: false, hasCollaboration: true },
      global: { stubs: { transition: false, 'transition-group': false } } })
  }
  const mountTeamHost = () => {
    const team = { teamRunId: 'host-run', focusedAgentRunId: '', lastActivityAt: '', executionRows: [workerRow, teamCopyRow, memberRow, collaboratorRow] as RunHistoryTeamExecutionRow[] } as TeamTreeNode
    return mount(WorkspaceTeamExecutionTree, { props: { team, treeLabel: 'Team', avatars: {} as any, isTeamSelected: false,
      isRowExpanded: () => true, formatRelativeTime: () => 'now' }, global: { stubs: { transition: false, 'transition-group': false } } })
  }

  it.each([['Agent run', mountAgentHost], ['Team run', mountTeamHost]] as const)('%s host: Task workers show their summary; members and collaborators keep one line (AC-001, AC-002)', (_host, mountHost) => {
    const wrapper = mountHost()
    expect(summaries(wrapper)).toEqual({ '/writer-run': 'Task t-writer', '/review-team': 'Task t-team', '/reviewer-run': null, '/collaborator-run': null })
    // One registration for the listed workers (members are never Task workers).
    expect(retained.at(-1)).toEqual([{ kind: 'agent', agentRunId: 'writer-run' }, { kind: 'team', teamRunId: 'review-team' }, { kind: 'agent', agentRunId: 'collaborator-run' }])
  })

  it.each([['Agent run', mountAgentHost], ['Team run', mountTeamHost]] as const)('%s host: a summary locates its Task, opening the run only on a page without a right panel (REQ-012)', async (_host, mountHost) => {
    const wrapper = mountHost()
    const locator = useTaskLocatorStore()
    const button = () => wrapper.get('[data-member-address="/writer-run"] [data-test="workspace-task-worker-task-summary"]')

    await button().trigger('click')
    expect(locator.request?.task).toEqual(task('t-writer'))
    expect(wrapper.emitted('open-run')).toHaveLength(1)
    expect(wrapper.emitted('select-run') ?? wrapper.emitted('select')).toBeUndefined()

    locator.registerShell()
    await button().trigger('click')
    expect(wrapper.emitted('open-run')).toHaveLength(1)
  })
})
