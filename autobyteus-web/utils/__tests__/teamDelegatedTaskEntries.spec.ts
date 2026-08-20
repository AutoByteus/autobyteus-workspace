import { describe, expect, it } from 'vitest';
import type { TaskExecutionDto } from '@autobyteus/team-stream-contracts';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';

const ROOT = 'root-team-run';
const TIME = '2026-08-20T10:00:00.000Z';
const reference = (id: string, path: string) => ({
  reference_id: id,
  path,
  type: 'file' as const,
  created_at: TIME,
  updated_at: TIME,
});
const baseNodes = () => {
  const lead = testAgentNode('/design_team/team_lead', { agentRunId: 'team-lead-run' });
  const worker = testAgentNode('/design_team/worker', { agentRunId: 'design-worker-run' });
  return {
    lead,
    worker,
    nodes: [
      testAgentNode('/coordinator', { agentRunId: 'coordinator-run' }),
      testAgentNode('/worker', { agentRunId: 'worker-run' }),
      testAgentNode('/other', { agentRunId: 'other-run' }),
      testSubTeamNode('/design_team', [lead, worker], {
        teamDefinitionId: 'design-team-def', teamRunId: 'design-team-persistent-run', coordinatorAddress: lead.address,
      }),
    ],
  };
};

describe('deriveDelegatedTaskEntries', () => {
  it('preserves task order and filters by the exact focused delegator or task AgentRun', () => {
    const { nodes } = baseNodes();
    const tasks = [
      testTaskRecord({
        taskId: 'task-1', delegatorAgentRunId: 'coordinator-run', recipientAddress: '/worker',
        target: { agentRunId: 'task-worker-run' }, description: 'Worker task',
      }),
      testTaskRecord({
        taskId: 'task-2', delegatorAgentRunId: 'other-run', recipientAddress: '/worker',
        target: { agentRunId: 'other-task-run' }, description: 'Unrelated task',
      }),
    ];
    const context = buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes, tasks });

    expect(deriveDelegatedTaskEntries(context).map((entry) => entry.taskId)).toEqual(['task-1', 'task-2']);
    expect(deriveDelegatedTaskEntries(context, 'coordinator-run').map((entry) => entry.taskId)).toEqual(['task-1']);
    expect(deriveDelegatedTaskEntries(context, 'task-worker-run').map((entry) => entry.taskId)).toEqual(['task-1']);
    expect(deriveDelegatedTaskEntries(context, 'worker-run')).toEqual([]);
  });

  it('projects the assignment and complete revision lifecycle with stable keys, ordinals, actors, and owned references', () => {
    const { nodes } = baseNodes();
    const task = testTaskRecord({
      taskId: 'task-cycle',
      delegatorAgentRunId: 'coordinator-run',
      recipientAddress: '/worker',
      target: { agentRunId: 'task-worker-run' },
      description: 'Prepare the proposal.',
      referenceFiles: [reference('root-ref', '/tmp/requirements.md')],
      status: 'accepted',
      createdAt: '2026-08-20T10:10:00.000Z',
      updates: [
        {
          kind: 'submission', submission_id: 'submission-1', message: 'Initial proposal.',
          reference_files: [reference('submission-ref', '/tmp/proposal.md')], created_at: '2026-08-20T10:28:00.000Z',
        },
        {
          kind: 'review', review_id: 'review-1', reviewed_submission_id: 'submission-1',
          decision: 'request_revision', comment: 'Keep the current layout.',
          reference_files: [reference('review-ref', '/tmp/feedback.md')], created_at: '2026-08-20T10:42:00.000Z',
        },
        {
          kind: 'submission', submission_id: 'submission-2', message: 'Revised proposal.',
          reference_files: [], created_at: '2026-08-20T11:06:00.000Z',
        },
        {
          kind: 'review', review_id: 'review-2', reviewed_submission_id: 'submission-2',
          decision: 'accept', comment: null, reference_files: [], created_at: '2026-08-20T11:18:00.000Z',
        },
      ],
    });
    const context = buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes, tasks: [task] });

    expect(deriveDelegatedTaskEntries(context, 'coordinator-run')).toEqual([{
      kind: 'task_agent',
      entryKey: 'task:task-cycle',
      teamRunId: ROOT,
      taskId: 'task-cycle',
      runId: 'task-worker-run',
      displayStatus: 'accepted',
      lastActivityAt: '2026-08-20T11:18:00.000Z',
      lifecycleItems: [
        {
          kind: 'assignment', itemKey: 'task:task-cycle:assignment', createdAt: '2026-08-20T10:10:00.000Z',
          content: 'Prepare the proposal.',
          direction: { kind: 'directed', from: { kind: 'named', label: 'coordinator' }, to: { kind: 'named', label: 'worker' } },
          referenceFiles: [expect.objectContaining({ referenceId: 'root-ref', path: '/tmp/requirements.md' })],
        },
        {
          kind: 'submission', itemKey: 'task:task-cycle:submission:submission-1', createdAt: '2026-08-20T10:28:00.000Z',
          content: 'Initial proposal.',
          direction: { kind: 'directed', from: { kind: 'named', label: 'worker' }, to: { kind: 'named', label: 'coordinator' } },
          referenceFiles: [expect.objectContaining({ referenceId: 'submission-ref', path: '/tmp/proposal.md' })],
          resultOrdinal: 1, revised: false,
        },
        {
          kind: 'review', decision: 'request_revision', itemKey: 'task:task-cycle:review:review-1',
          createdAt: '2026-08-20T10:42:00.000Z', content: 'Keep the current layout.',
          direction: { kind: 'directed', from: { kind: 'named', label: 'coordinator' }, to: { kind: 'named', label: 'worker' } },
          referenceFiles: [expect.objectContaining({ referenceId: 'review-ref', path: '/tmp/feedback.md' })],
          reviewedResultOrdinal: 1,
        },
        {
          kind: 'submission', itemKey: 'task:task-cycle:submission:submission-2', createdAt: '2026-08-20T11:06:00.000Z',
          content: 'Revised proposal.',
          direction: { kind: 'directed', from: { kind: 'named', label: 'worker' }, to: { kind: 'named', label: 'coordinator' } },
          referenceFiles: [], resultOrdinal: 2, revised: true,
        },
        {
          kind: 'review', decision: 'accept', itemKey: 'task:task-cycle:review:review-2',
          createdAt: '2026-08-20T11:18:00.000Z', content: null,
          direction: { kind: 'directed', from: { kind: 'named', label: 'coordinator' }, to: { kind: 'named', label: 'worker' } },
          referenceFiles: [], reviewedResultOrdinal: 2,
        },
      ],
    }]);
  });

  it('derives every human display status and interruption item from authoritative lifecycle state', () => {
    const { nodes } = baseNodes();
    const make = (taskId: string, status: 'active' | 'awaiting_review' | 'accepted' | 'interrupted', updates: any[] = []) => testTaskRecord({
      taskId, status, updates, delegatorAgentRunId: 'coordinator-run', recipientAddress: '/worker',
      target: { agentRunId: `${taskId}-run` },
    });
    const tasks = [
      make('active', 'active'),
      make('waiting', 'awaiting_review', [{
        kind: 'submission', submission_id: 'submission-waiting', message: 'Ready.', reference_files: [], created_at: TIME,
      }]),
      make('revision', 'active', [
        { kind: 'submission', submission_id: 'submission-revision', message: 'Draft.', reference_files: [], created_at: TIME },
        {
          kind: 'review', review_id: 'review-revision', reviewed_submission_id: 'submission-revision',
          decision: 'request_revision', comment: 'Revise.', reference_files: [], created_at: TIME,
        },
      ]),
      make('accepted', 'accepted', [
        { kind: 'submission', submission_id: 'submission-accepted', message: 'Done.', reference_files: [], created_at: TIME },
        {
          kind: 'review', review_id: 'review-accepted', reviewed_submission_id: 'submission-accepted',
          decision: 'accept', comment: 'Good.', reference_files: [], created_at: TIME,
        },
      ]),
      make('interrupted', 'interrupted', [{
        kind: 'interruption', interruption_id: 'interrupt-1', reason: 'Root TeamRun terminated.', created_at: TIME,
      }]),
    ];
    const context = buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes, tasks });
    const entries = deriveDelegatedTaskEntries(context);

    expect(entries.map((entry) => entry.displayStatus)).toEqual([
      'in_progress', 'awaiting_review', 'revision_requested', 'accepted', 'interrupted',
    ]);
    expect(entries.at(-1)?.lifecycleItems.at(-1)).toEqual(expect.objectContaining({
      kind: 'interruption', content: 'Root TeamRun terminated.', direction: { kind: 'system' }, referenceFiles: [],
    }));
  });

  it('uses a task Team as the visible assignee and includes each concrete child AgentRun in its perspective', () => {
    const { nodes } = baseNodes();
    const task = testTaskRecord({
      taskId: 'task-team-1', delegatorAgentRunId: 'coordinator-run', recipientAddress: '/design_team',
      target: { teamRunId: 'task-team-run' }, description: 'Live Team task',
      updates: [{
        kind: 'submission', submission_id: 'team-submission', message: 'Team result.', reference_files: [], created_at: TIME,
      }],
    });
    const context = buildTestTeamContext({
      teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes, tasks: [task],
    });

    const entry = deriveDelegatedTaskEntries(context, 'task-team-run:team-lead-run')[0];
    expect(entry).toEqual(expect.objectContaining({ taskId: 'task-team-1', kind: 'task_team', runId: 'task-team-run' }));
    expect(entry.lifecycleItems[0].direction).toEqual({
      kind: 'directed', from: { kind: 'named', label: 'coordinator' }, to: { kind: 'named', label: 'design_team' },
    });
    expect(entry.lifecycleItems[1].direction).toEqual({
      kind: 'directed', from: { kind: 'named', label: 'design_team' }, to: { kind: 'named', label: 'coordinator' },
    });
    expect(deriveDelegatedTaskEntries(context, 'team-lead-run')).toEqual([]);
  });

  it('keeps a nested task Agent distinct inside its task Team subtree', () => {
    const { nodes } = baseNodes();
    const outer = testTaskRecord({
      taskId: 'task-team-1', delegatorAgentRunId: 'coordinator-run', recipientAddress: '/design_team',
      target: { teamRunId: 'task-team-run' }, description: 'Outer Team task',
    });
    const child = testTaskRecord({
      taskId: 'child-task-1', delegatorAgentRunId: 'task-team-run:team-lead-run',
      recipientAddress: '/design_team/worker', target: { agentRunId: 'child-task-agent-run' },
      description: 'Nested child task',
    });
    const nestedExecution: TaskExecutionDto = {
      kind: 'task_team', address: '/design_team', team_run_id: 'task-team-run',
      started_at: outer.created_at, settled_at: null,
      members: [
        { kind: 'task_team_agent', address: '/design_team/team_lead', agent_run_id: 'task-team-run:team-lead-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/design_team/worker', agent_run_id: 'task-team-run:design-worker-run', platform_agent_run_id: null },
      ],
      task_executions: [{
        kind: 'task_agent', address: '/design_team/worker', agent_run_id: 'child-task-agent-run',
        platform_agent_run_id: null, started_at: child.created_at, settled_at: null,
      }],
    };
    const context = buildTestTeamContext({
      teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes,
      tasks: [outer, child], taskExecutions: [nestedExecution],
    });

    expect(deriveDelegatedTaskEntries(context, 'child-task-agent-run')).toEqual([
      expect.objectContaining({ taskId: 'child-task-1', kind: 'task_agent', runId: 'child-task-agent-run' }),
    ]);
  });
});
