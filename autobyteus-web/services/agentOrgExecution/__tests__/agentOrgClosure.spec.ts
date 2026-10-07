import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { AgentOrgExecutionContext } from '../agentOrgExecutionContext'
import { AgentOrgExecutionViewIndex } from '../agentOrgExecutionViewIndex'
import { createAgentContext } from '../agentOrgMemberContextFactory'
import { taskBearingView } from './taskBearingOrgFixture'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { parseAgentOrgHistoryItem } from '~/stores/runHistoryStoreSupport'
import { projectAgentOrgHistoryRows } from '~/utils/agentOrgHistoryRows'

vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))

type Closed = AgentOrgExecutionViewDto['closed_task_executions']

const runFor = (closed: Closed): AgentOrgRunHistoryItem => {
  const tree = structuredClone(taskBearingView().execution_tree)
  return { stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run', createdAt: tree.createdAt,
    archivedAt: null, isActive: false, summary: 'Delegating Org', executionTree: tree, closedTaskExecutions: closed }
}
const buildContext = (closed: Closed = []) => {
  const view = { ...taskBearingView(), closed_task_executions: closed }
  return new AgentOrgExecutionContext({ orgRunId: 'org-run', view,
    entries: [...new AgentOrgExecutionViewIndex(view).agents.values()].map((agent) => ({
      agentRunId: agent.agentRunId, memberAddress: agent.address,
      context: createAgentContext({ address: agent.address, agentRunId: agent.agentRunId,
        agentDefinitionId: agent.source.agentDefinitionId, launch: agent.source.launchConfiguration }, view.execution_tree.createdAt, null),
    })) })
}
const rowKeys = (run: AgentOrgRunHistoryItem, context: AgentOrgExecutionContext | null = null) =>
  projectAgentOrgHistoryRows({ run, context, isTeamExpanded: () => true }).map((display) => display.row.key)

/** task-run-resources-workspace-cleanup (Org root): closed task executions leave the Workspaces rows. */
describe('Agent Org closed task executions', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('hides closed rows from the history item alone, before any Org context hydrates (AR-001, SP-3)', () => {
    expect(rowKeys(runFor([]))).toEqual(expect.arrayContaining(['task-agent:agent-worker-task', 'task-team:team-task', 'task-team-agent:agent-task-lead']))
    const keys = rowKeys(runFor([{ teamRunId: 'team-task' }]))
    expect(keys).not.toContain('task-team:team-task')
    expect(keys).not.toContain('task-team-agent:agent-task-lead')
    expect(keys).not.toContain('task-team-agent:agent-task-worker')
    // Configured members and the other Task's run stay.
    expect(keys).toEqual(expect.arrayContaining(['agent:agent-director', 'team:team-configured', 'agent:agent-lead-configured', 'task-agent:agent-worker-task']))
  })

  it('uses the context closure once a context exists (it is kept current by live events)', () => {
    const context = buildContext()
    expect(context.applyEvent(9, { kind: 'task_executions_closed', task_executions: [{ agentRunId: 'agent-worker-task' }] })).toBe('applied')
    const keys = rowKeys(runFor([{ teamRunId: 'team-task' }]), context)
    expect(keys).not.toContain('task-agent:agent-worker-task')
    expect(keys).toContain('task-team:team-task')
    // The tree and the index keep the closed run (Team tab, REQ-008).
    expect(context.getAgentContext('agent-worker-task')).not.toBeNull()
    expect(context.isListed('agent-worker-task')).toBe(false)
  })

  it('moves a selected closed agent to the agent that delegated its outermost closed execution (REQ-009)', () => {
    const context = buildContext()
    context.select({ kind: 'agent_execution', agentRunId: 'agent-task-worker' })
    expect(context.selectedTarget()?.context.state.runId).toBe('agent-task-worker')
    context.applyEvent(9, { kind: 'task_executions_closed', task_executions: [{ teamRunId: 'team-task' }] })
    expect(context.selection).toEqual({ kind: 'agent_execution', agentRunId: 'agent-director' })
    // A closed run cannot be selected afterwards.
    context.select({ kind: 'agent_execution', agentRunId: 'agent-task-lead' })
    expect(context.selection).toEqual({ kind: 'agent_execution', agentRunId: 'agent-director' })
  })

  it('lists a reactivated task execution again on task_executions_reopened; other closed ones stay hidden (REQ-008, AC-004)', () => {
    const context = buildContext([{ teamRunId: 'team-task' }, { agentRunId: 'agent-worker-task' }])
    expect(context.isListed('agent-task-lead')).toBe(false)
    expect(context.applyEvent(9, { kind: 'task_executions_reopened', task_executions: [{ teamRunId: 'team-task' }] })).toBe('applied')
    expect(context.view.closed_task_executions).toEqual([{ agentRunId: 'agent-worker-task' }])
    const keys = rowKeys(runFor([{ teamRunId: 'team-task' }, { agentRunId: 'agent-worker-task' }]), context)
    expect(keys).toEqual(expect.arrayContaining(['task-team:team-task', 'task-team-agent:agent-task-lead']))
    expect(keys).not.toContain('task-agent:agent-worker-task')
    expect(context.isListed('agent-task-lead')).toBe(true)
  })

  it('requires a fresh view when a reopened reference is a configured member', () => {
    const context = buildContext()
    expect(() => context.applyEvent(9, { kind: 'task_executions_reopened', task_executions: [{ agentRunId: 'agent-director' }] })).toThrow()
    expect(context.phase).toBe('reopen_required')
  })

  it('requires a fresh view when a closed reference is a configured member', () => {
    const context = buildContext()
    expect(() => context.applyEvent(9, { kind: 'task_executions_closed', task_executions: [{ agentRunId: 'agent-director' }] })).toThrow()
    expect(context.phase).toBe('reopen_required')
  })

  it('parses the history item closure and requires it', () => {
    const raw = { root_subject_kind: 'agent_org', root_run_id: 'org-run', created_at: 'now', archived_at: null, is_active: false,
      summary: 'Delegating Org', org: taskBearingView().execution_tree }
    expect(parseAgentOrgHistoryItem({ ...raw, closed_task_executions: [{ teamRunId: 'team-task' }] }).closedTaskExecutions)
      .toEqual([{ teamRunId: 'team-task' }])
    expect(() => parseAgentOrgHistoryItem(raw)).toThrow()
  })
})
