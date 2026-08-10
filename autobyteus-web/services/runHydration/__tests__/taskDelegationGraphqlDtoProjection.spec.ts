import { describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  projectTaskDelegationRecordDto,
  projectTaskDelegationRecordDtos,
} from '../taskDelegationGraphqlDtoProjection';
import { hydrateTaskDelegationRecords } from '../taskDelegationHydrationService';
import { useTaskDelegationStore } from '~/stores/taskDelegationStore';

const address = (memberAddress: string, taskTeamRunIds: string[] = [], taskAgentRunId: string | null = null) => ({
  __typename: 'TaskDelegationTargetAddressObject',
  rootTeamRunId: 'root-team-run-1',
  taskTeamRunIds,
  memberAddress,
  taskAgentRunId,
});

const capturedApolloRecord = () => ({
  __typename: 'TaskDelegationRecordObject',
  taskId: 'task_0003',
  status: 'awaiting_review',
  senderAddress: address('/Teacher'),
  receiverAddress: address('/StudentStudyGroup'),
  receiverTargetKind: 'agent_team',
  content: 'Solve the exact nested-classroom exercise.',
  referenceFiles: [],
  taskRun: {
    __typename: 'TaskDelegationTaskRunObject',
    address: address('/StudentStudyGroup', ['task-team-run-3']),
    startedAt: '2026-08-10T12:00:00.000Z',
  },
  updates: [{
    __typename: 'TaskDelegationUpdateObject',
    kind: 'submission',
    submissionId: 'submission-3',
    reviewId: null,
    reviewedSubmissionId: null,
    decision: null,
    senderAddress: address('/StudentStudyGroup/student_one', ['task-team-run-3']),
    receiverAddress: address('/Teacher'),
    content: 'NESTED_CLASSROOM_OK',
    referenceFiles: [],
    createdAt: '2026-08-10T12:01:00.000Z',
  }],
  createdAt: '2026-08-10T12:00:00.000Z',
});

describe('taskDelegationGraphqlDtoProjection', () => {
  it('projects the captured Apollo shape into an exact current record and hydrates one visible task', () => {
    setActivePinia(createPinia());
    const records = projectTaskDelegationRecordDtos([capturedApolloRecord()]);
    hydrateTaskDelegationRecords('root-team-run-1', records);

    expect(records).toEqual([expect.objectContaining({
      taskId: 'task_0003',
      status: 'awaiting_review',
      senderAddress: {
        rootTeamRunId: 'root-team-run-1',
        taskTeamRunIds: [],
        memberAddress: '/Teacher',
        taskAgentRunId: null,
      },
      taskRun: {
        address: {
          rootTeamRunId: 'root-team-run-1',
          taskTeamRunIds: ['task-team-run-3'],
          memberAddress: '/StudentStudyGroup',
          taskAgentRunId: null,
        },
        startedAt: '2026-08-10T12:00:00.000Z',
      },
      updates: [expect.objectContaining({ kind: 'submission', submissionId: 'submission-3' })],
    })]);
    expect(JSON.stringify(records)).not.toContain('__typename');
    expect(useTaskDelegationStore().getRecordsForTeam('root-team-run-1')).toHaveLength(1);
  });

  it('rejects removed path fields and unknown Apollo metadata instead of weakening exact identity', () => {
    const withRemovedPath = capturedApolloRecord() as any;
    withRemovedPath.receiverAddress.memberPath = ['StudentStudyGroup'];
    const withUnknownMetadata = capturedApolloRecord() as any;
    withUnknownMetadata.senderAddress.__typename = 'UnexpectedAddressObject';

    expect(projectTaskDelegationRecordDto(withRemovedPath)).toBeNull();
    expect(projectTaskDelegationRecordDto(withUnknownMetadata)).toBeNull();
  });
});
