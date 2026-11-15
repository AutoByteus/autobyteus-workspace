import { describe, expect, it } from 'vitest';
import {
  applyTestTeamMessage,
  buildTestTeamContext,
  testAgentNode,
  testDelegation,
  testTaskTeamLayout,
} from '~/test-support/currentTeamTestFixtures';

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
/** A catalog Team the solution designer delegates a copy of; not a member of the root Team (Teams are flat). */
const softwareTeam = testTaskTeamLayout('/SoftwareEngineeringTeam', [reviewLead], {
  teamDefinitionId: 'software-team', coordinatorAddress: reviewLead.address,
});
const TASK_TEAM_MEMBER = 'task-team-run-1:review-lead-run';


const build = (closed: Array<{ agentRunId: string } | { teamRunId: string }> = [], focusedAgentRunId?: string) => buildTestTeamContext({
  teamRunId: ROOT, coordinatorAddress: solution.address, rootChildren: [solution, worker, reviewer],
  baseChangeSequence: 3, closedTaskExecutions: closed, focusedAgentRunId,
  delegations: [
    testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: worker.address, target: { agentRunId: 'task-agent-run-1' } }),
    testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: softwareTeam.address, target: { teamRunId: 'task-team-run-1', team: softwareTeam } }),
    // Started by a worker of Task A, at another address: its delegator is itself closed with Task A.
    testDelegation({ delegatorAgentRunId: 'task-agent-run-1', recipientAddress: reviewer.address, target: { agentRunId: 'sub-task-run' } }),
    testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: worker.address, target: { agentRunId: 'other-task-run' } }),
  ],
});
/** A task execution's record as the view holds it, the shape a "reopened" event carries (autobyteus-469 D-8). */
const recordOf = (context: ReturnType<typeof build>, runId: string) => context.view.getExecutionTree().root_team.task_executions
  .find((execution: any) => (execution.agent_run_id ?? execution.team_run_id) === runId)!;
const reopenedMessage = (sequence: number, records: readonly any[]) =>
  ({ type: 'TASK_EXECUTIONS_REOPENED', payload: { change_sequence: sequence, executions: records.map((execution) => ({ parent_team_run_id: ROOT, execution })) } }) as const;
const closedMessage = (sequence: number, taskExecutions: Array<{ agent_run_id: string } | { team_run_id: string }>) =>
  ({ type: 'TASK_EXECUTIONS_CLOSED', payload: { change_sequence: sequence, task_executions: taskExecutions } }) as const;

describe('Team root closed task executions', () => {
  it('applies TASK_EXECUTIONS_CLOSED in sequence and moves a focused closed agent to the delegating member', () => {
    const context = build([], TASK_TEAM_MEMBER);
    expect(context.view.getFocusedAgentRunId()).toBe(TASK_TEAM_MEMBER);
    const result = applyTestTeamMessage(context, closedMessage(4, [{ team_run_id: 'task-team-run-1' }]));
    expect(result).toMatchObject({ disposition: 'applied' });
    expect(result.effects.map((effect) => effect.kind)).toEqual(['reconcile_focused_team_member_projection', 'reconcile_team_navigation']);
    expect(context.view.getFocusedAgentRunId()).toBe('solution-designer-run');
    expect(context.view.getChangeSequence()).toBe(4);
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
        root_team_run_id: ROOT, base_change_sequence: 9, live_sequence_id: 'live-1', last_message_change_sequence: 0, closed_task_executions: [{ agent_run_id: 'task-agent-run-1' }],
        execution_tree: context.view.getExecutionTree(), agent_input_states: [], remote_task_executions: [],
        agent_statuses: context.view.listAgentContextEntries().map((entry) => ({ agent_run_id: entry.agentRunId, member_address: entry.memberAddress,
          status: 'idle' as const, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null })),
      },
    };
    expect(context.view.applySnapshot(snapshot as never)).toMatchObject({ disposition: 'applied' });
    expect(context.view.getFocusedAgentRunId()).toBe('solution-designer-run');
  });
});
