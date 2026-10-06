import { describe, expect, it } from 'vitest';
import {
  applyTestTeamMessage,
  buildTestTeamContext,
  testAgentNode,
  testDelegation,
  testSubTeamNode,
} from '~/test-support/currentTeamTestFixtures';
import { buildRunHistoryTeamExecutionRows } from '../runHistoryTeamExecutionRows';

/**
 * task-run-resources-workspace-cleanup (Team root): the Workspaces tree leaves out a closed task
 * execution (Task DONE) and everything under it; the shared navigation rows (members panel,
 * running list, token usage, mobile focus) stay complete (AR-002); a focused closed agent falls back.
 */
const ROOT = 'team-run-1';
const solution = testAgentNode('/solution_designer', { agentRunId: 'solution-designer-run' });
const worker = testAgentNode('/worker', { agentRunId: 'worker-run' });
const reviewer = testAgentNode('/reviewer', { agentRunId: 'reviewer-run' });
const reviewLead = testAgentNode('/SoftwareEngineeringTeam/review_lead', { agentRunId: 'review-lead-run' });
const softwareTeam = testSubTeamNode('/SoftwareEngineeringTeam', [reviewLead], {
  teamDefinitionId: 'software-team', teamRunId: 'software-team-run', coordinatorAddress: reviewLead.address,
});
const TASK_TEAM_MEMBER = 'task-team-run-1:review-lead-run';

const historyTeam = () => {
  const stable = (address: string, agentRunId: string | null, children: any[] = [], extra: Record<string, unknown> = {}) => ({
    teamRunId: ROOT, kind: children.length ? 'agent_team' : 'agent', memberAddress: address,
    displayName: address.split('/').at(-1), agentRunId, teamRunIdForNode: null, children, currentStatus: null, ...extra,
  });
  const children = [
    stable(solution.address, solution.agentRunId), stable(worker.address, worker.agentRunId), stable(reviewer.address, reviewer.agentRunId),
    stable(softwareTeam.address, null, [stable(reviewLead.address, reviewLead.agentRunId)], { teamRunIdForNode: 'software-team-run' }),
  ];
  return { teamRunId: ROOT, rootTeam: { children }, members: children } as any;
};

const build = (closed: Array<{ agentRunId: string } | { teamRunId: string }> = [], focusedAgentRunId?: string) => buildTestTeamContext({
  teamRunId: ROOT, coordinatorAddress: solution.address, rootChildren: [solution, worker, reviewer, softwareTeam],
  baseChangeSequence: 3, closedTaskExecutions: closed, focusedAgentRunId,
  delegations: [
    testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: worker.address, target: { agentRunId: 'task-agent-run-1' } }),
    testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: softwareTeam.address, target: { teamRunId: 'task-team-run-1' } }),
    // Started by a worker of Task A, at another address: its delegator is itself closed with Task A.
    testDelegation({ delegatorAgentRunId: 'task-agent-run-1', recipientAddress: reviewer.address, target: { agentRunId: 'sub-task-run' } }),
    testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: worker.address, target: { agentRunId: 'other-task-run' } }),
  ],
});
const treeRunIds = (context: ReturnType<typeof build>) => buildRunHistoryTeamExecutionRows(historyTeam(), context)
  .map((row) => row.agentRunId ?? row.teamRunIdForNode);
const closedMessage = (sequence: number, taskExecutions: Array<{ agent_run_id: string } | { team_run_id: string }>) =>
  ({ type: 'TASK_EXECUTIONS_CLOSED', payload: { change_sequence: sequence, task_executions: taskExecutions } }) as const;

describe('Team root closed task executions', () => {
  it('leaves closed task executions and their members out of the Workspaces tree only', () => {
    const open = build();
    expect(treeRunIds(open)).toEqual(expect.arrayContaining(['task-agent-run-1', 'task-team-run-1', TASK_TEAM_MEMBER, 'sub-task-run', 'other-task-run']));
    const context = build([{ teamRunId: 'task-team-run-1' }, { agentRunId: 'task-agent-run-1' }]);
    const ids = treeRunIds(context);
    for (const hidden of ['task-agent-run-1', 'task-team-run-1', TASK_TEAM_MEMBER]) expect(ids).not.toContain(hidden);
    expect(ids).toEqual(expect.arrayContaining(['solution-designer-run', 'worker-run', 'reviewer-run', 'review-lead-run', 'sub-task-run', 'other-task-run']));
    // Shared navigation rows and contexts are unchanged (members panel, running list, token usage, mobile focus).
    expect(context.view.listNavigationRows()).toEqual(open.view.listNavigationRows());
    expect(context.view.getAgentContext(TASK_TEAM_MEMBER)).not.toBeNull();
    const memberRow = context.view.listNavigationRows().find((row) => row.agentRunId === TASK_TEAM_MEMBER)!;
    expect(context.view.isTaskExecutionRowListed(memberRow)).toBe(false);
  });

  it('applies TASK_EXECUTIONS_CLOSED in sequence and moves a focused closed agent to the delegating member', () => {
    const context = build([], TASK_TEAM_MEMBER);
    expect(context.view.getFocusedAgentRunId()).toBe(TASK_TEAM_MEMBER);
    const result = applyTestTeamMessage(context, closedMessage(4, [{ team_run_id: 'task-team-run-1' }]));
    expect(result).toMatchObject({ disposition: 'applied' });
    expect(result.effects.map((effect) => effect.kind)).toEqual(['reconcile_focused_team_member_projection', 'reconcile_team_navigation']);
    expect(context.view.getFocusedAgentRunId()).toBe('solution-designer-run');
    expect(context.view.getChangeSequence()).toBe(4);
    expect(treeRunIds(context)).not.toContain(TASK_TEAM_MEMBER);
    // A repeated DONE re-publishes the same reference: idempotent, focus untouched.
    expect(applyTestTeamMessage(context, closedMessage(5, [{ team_run_id: 'task-team-run-1' }])).effects.map((effect) => effect.kind))
      .toEqual(['reconcile_team_navigation']);
  });

  it('falls back to the root coordinator when the delegator of the outermost closed execution is itself closed', () => {
    const context = build([], 'sub-task-run');
    applyTestTeamMessage(context, closedMessage(4, [{ agent_run_id: 'task-agent-run-1' }, { agent_run_id: 'sub-task-run' }]));
    expect(context.view.getFocusedAgentRunId()).toBe('solution-designer-run');
    const other = build([], 'other-task-run');
    applyTestTeamMessage(other, closedMessage(4, [{ agent_run_id: 'task-agent-run-1' }]));
    expect(other.view.getFocusedAgentRunId()).toBe('other-task-run');
  });

  it('rejects a closed reference that is not in the execution tree and keeps the sequence', () => {
    const context = build();
    expect(applyTestTeamMessage(context, closedMessage(4, [{ agent_run_id: 'ghost-run' }]))).toMatchObject({ disposition: 'rejected' });
    expect(context.view.getChangeSequence()).toBe(3);
  });

  it('takes the closed list from a snapshot and falls focus back after it', () => {
    const context = build([], 'task-agent-run-1');
    const snapshot = {
      type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' as const,
      payload: {
        root_team_run_id: ROOT, base_change_sequence: 9, closed_task_executions: [{ agent_run_id: 'task-agent-run-1' }],
        execution_tree: context.view.getExecutionTree(), messages: [], agent_input_states: [],
        agent_statuses: context.view.listAgentContextEntries().map((entry) => ({ agent_run_id: entry.agentRunId, member_address: entry.memberAddress,
          status: 'idle' as const, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null })),
      },
    };
    expect(context.view.applySnapshot(snapshot as never)).toMatchObject({ disposition: 'applied' });
    expect(treeRunIds(context)).not.toContain('task-agent-run-1');
    expect(context.view.getFocusedAgentRunId()).toBe('solution-designer-run');
  });
});
