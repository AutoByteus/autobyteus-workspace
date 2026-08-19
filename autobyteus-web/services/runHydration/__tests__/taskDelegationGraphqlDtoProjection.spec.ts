import { describe, expect, it, vi } from 'vitest';
import {
  projectTaskDelegationRecordDto,
  projectTaskDelegationRecordDtos,
} from '../taskDelegationGraphqlDtoProjection';
import { fetchTaskDelegationRecordsForTeam } from '../taskDelegationHydrationService';

const reference = () => ({
  __typename: 'TaskDelegationReferenceFileObject',
  referenceId: 'reference-1', path: '/tmp/reference.md', type: 'file',
  createdAt: '2026-08-10T12:00:00.000Z', updatedAt: '2026-08-10T12:00:01.000Z',
});

const capturedApolloRecord = () => ({
  __typename: 'TaskDelegationRecordObject',
  taskId: 'task_0003',
  delegatorAgentRunId: 'teacher-run',
  recipientAddress: '/StudentStudyGroup',
  targetAgentRunId: null,
  targetTeamRunId: 'task-team-run-3',
  description: 'Solve the exact nested-classroom exercise.',
  referenceFiles: [reference()],
  status: 'awaiting_review',
  updates: [{
    __typename: 'TaskDelegationUpdateObject',
    kind: 'submission',
    submissionId: 'submission-3',
    reviewId: null,
    interruptionId: null,
    reviewedSubmissionId: null,
    decision: null,
    content: 'NESTED_CLASSROOM_OK',
    referenceFiles: [],
    createdAt: '2026-08-10T12:01:00.000Z',
  }],
  createdAt: '2026-08-10T12:00:00.000Z',
});

describe('taskDelegationGraphqlDtoProjection', () => {
  it('projects the exact Apollo record to the current root task schema', async () => {
    const client = { query: vi.fn().mockResolvedValue({
      data: { getTaskDelegationRecords: [capturedApolloRecord()] }, errors: [],
    }) };
    const records = await fetchTaskDelegationRecordsForTeam({ client, teamRunId: 'root-team-run-1' });

    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: { teamRunId: 'root-team-run-1' }, fetchPolicy: 'network-only',
    }));
    expect(records).toEqual([{
      task_id: 'task_0003',
      delegator_agent_run_id: 'teacher-run',
      recipient_address: '/StudentStudyGroup',
      task_execution: { team_run_id: 'task-team-run-3' },
      description: 'Solve the exact nested-classroom exercise.',
      reference_files: [{
        reference_id: 'reference-1', path: '/tmp/reference.md', type: 'file',
        created_at: '2026-08-10T12:00:00.000Z', updated_at: '2026-08-10T12:00:01.000Z',
      }],
      status: 'awaiting_review',
      updates: [{
        kind: 'submission', submission_id: 'submission-3', message: 'NESTED_CLASSROOM_OK',
        reference_files: [], created_at: '2026-08-10T12:01:00.000Z',
      }],
      created_at: '2026-08-10T12:00:00.000Z',
    }]);
    expect(JSON.stringify(records)).not.toContain('__typename');
  });

  it('rejects ambiguous execution targets and unsupported GraphQL metadata', () => {
    const ambiguous = capturedApolloRecord();
    ambiguous.targetAgentRunId = 'task-agent-run';
    const withRemovedPath = { ...capturedApolloRecord(), memberPath: ['StudentStudyGroup'] };
    const wrongType = { ...capturedApolloRecord(), __typename: 'UnexpectedRecordObject' };

    expect(() => projectTaskDelegationRecordDto(ambiguous))
      .toThrow('Task delegation record must have exactly one task execution target.');
    expect(() => projectTaskDelegationRecordDto(withRemovedPath))
      .toThrow('Task delegation record has unsupported or missing GraphQL fields.');
    expect(() => projectTaskDelegationRecordDtos([wrongType]))
      .toThrow('Task delegation record[0] has the wrong GraphQL type.');
  });
});
