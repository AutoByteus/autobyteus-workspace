import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import {
  createTeamExecutionAddress,
  toTeamExecutionAddressDto,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type { TeamTaskProjectionStatus } from '~/services/teamExecution/teamExecutionModels';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures';

const ROOT_TEAM_RUN_ID = 'root-team-run-1';
const NOW = '2026-08-10T12:00:00.000Z';

export const buildCurrentTaskExecutionTeam = (): AgentTeamContext => buildTestTeamContext({
  teamRunId: ROOT_TEAM_RUN_ID,
  teamDefinitionId: 'nested-classroom-definition',
  teamDefinitionName: 'Nested Classroom Test Team',
  coordinatorAddress: '/Teacher',
  focusedExecutionAddress: createTeamExecutionAddress({
    rootTeamRunId: ROOT_TEAM_RUN_ID,
    memberAddress: '/Teacher',
  }),
  rootChildren: [
    testAgentNode('/Teacher', {
      agentDefinitionId: 'teacher-definition',
      agentRunId: 'teacher-persistent-run',
      llmModelIdentifier: 'gpt-5.6-luna',
    }),
    testSubTeamNode('/StudentStudyGroup', [
      testAgentNode('/StudentStudyGroup/student_one', {
        agentDefinitionId: 'student-one-definition',
        agentRunId: 'student-one-persistent-run',
        llmModelIdentifier: 'gpt-5.6-luna',
      }),
      testSubTeamNode('/StudentStudyGroup/LabGroup', [
        testAgentNode('/StudentStudyGroup/LabGroup/lab_one', {
          agentDefinitionId: 'lab-one-definition',
          agentRunId: 'lab-one-persistent-run',
          llmModelIdentifier: 'gpt-5.6-luna',
        }),
        testAgentNode('/StudentStudyGroup/LabGroup/lab_two', {
          agentDefinitionId: 'lab-two-definition',
          agentRunId: 'lab-two-persistent-run',
          llmModelIdentifier: 'gpt-5.6-luna',
        }),
      ], {
        teamDefinitionId: 'lab-group-definition',
        teamRunId: 'lab-group-persistent-run',
        coordinatorAddress: '/StudentStudyGroup/LabGroup/lab_one',
      }),
      testAgentNode('/StudentStudyGroup/student_two', {
        agentDefinitionId: 'student-two-definition',
        agentRunId: 'student-two-persistent-run',
        llmModelIdentifier: 'gpt-5.6-luna',
      }),
    ], {
      teamDefinitionId: 'study-group-definition',
      teamRunId: 'study-group-persistent-run',
      coordinatorAddress: '/StudentStudyGroup/student_one',
    }),
  ],
});

export const taskAgentAddress = (input: {
  memberAddress?: string;
  taskTeamRunIds?: string[];
  taskAgentRunId?: string;
} = {}): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: ROOT_TEAM_RUN_ID,
  taskTeamRunIds: input.taskTeamRunIds ?? [],
  memberAddress: input.memberAddress ?? '/Teacher',
  taskAgentRunId: input.taskAgentRunId ?? 'task-agent-run-1',
});

export const taskTeamExecutionAddress = (input: {
  nested?: boolean;
  taskTeamRunIds?: string[];
} = {}): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: ROOT_TEAM_RUN_ID,
  taskTeamRunIds: input.taskTeamRunIds ?? (input.nested ? ['task-team-outer', 'task-team-inner'] : ['task-team-outer']),
  memberAddress: input.nested ? '/StudentStudyGroup/LabGroup' : '/StudentStudyGroup',
  taskAgentRunId: null,
});

export const taskTeamCoordinatorAddress = (input: {
  nested?: boolean;
  taskTeamRunIds?: string[];
} = {}): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: ROOT_TEAM_RUN_ID,
  taskTeamRunIds: input.taskTeamRunIds ?? (input.nested ? ['task-team-outer', 'task-team-inner'] : ['task-team-outer']),
  memberAddress: input.nested
    ? '/StudentStudyGroup/LabGroup/lab_one'
    : '/StudentStudyGroup/student_one',
  taskAgentRunId: null,
});

export const taskAgentProjection = (input: {
  address?: TeamExecutionAddress;
  senderAddress?: TeamExecutionAddress;
  taskId?: string;
  description?: string;
  status?: TeamTaskProjectionStatus;
} = {}) => {
  const address = input.address ?? taskAgentAddress();
  return testTaskProjection({
    taskId: input.taskId ?? 'task-agent-0001',
    executionAddress: address,
    senderAddress: input.senderAddress ?? createTeamExecutionAddress({
      rootTeamRunId: ROOT_TEAM_RUN_ID,
      taskTeamRunIds: address.taskTeamRunIds,
      memberAddress: address.taskTeamRunIds.length ? '/StudentStudyGroup/student_one' : '/Teacher',
    }),
    status: input.status,
    content: input.description ?? 'Solve the delegated classroom exercise.',
  });
};

export const taskTeamProjection = (input: {
  nested?: boolean;
  status?: TeamTaskProjectionStatus;
  taskId?: string;
  taskTeamRunIds?: string[];
  senderAddress?: TeamExecutionAddress;
  description?: string;
} = {}) => {
  const nested = input.nested ?? false;
  const address = taskTeamExecutionAddress({ nested, taskTeamRunIds: input.taskTeamRunIds });
  return testTaskProjection({
    taskId: input.taskId ?? (nested ? 'task-team-inner-0002' : 'task-team-outer-0001'),
    executionAddress: address,
    senderAddress: input.senderAddress ?? createTeamExecutionAddress({
      rootTeamRunId: ROOT_TEAM_RUN_ID,
      taskTeamRunIds: address.taskTeamRunIds.slice(0, -1),
      memberAddress: nested ? '/StudentStudyGroup/student_one' : '/Teacher',
    }),
    status: input.status,
    content: input.description ?? (nested
      ? 'Coordinate the nested laboratory exercise.'
      : 'Coordinate the study-group exercise.'),
  });
};

export const taskAgentEvent = (input: {
  status?: TeamTaskProjectionStatus;
  address?: TeamExecutionAddress;
  senderAddress?: TeamExecutionAddress;
  taskId?: string;
  description?: string;
} = {}) => {
  const projection = taskAgentProjection(input);
  if (input.status === 'awaiting_review') return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: 'TASK_DELEGATION_RESULT_SUBMITTED',
      task_id: projection.taskId,
      execution_address: toTeamExecutionAddressDto(projection.executionAddress),
      submission_id: `${projection.taskId}-submission`,
      submitted_at: '2026-08-10T12:01:00.000Z',
    },
  } as const;
  if (input.status === 'accepted') return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: 'TASK_DELEGATION_RESULT_REVIEWED',
      task_id: projection.taskId,
      execution_address: toTeamExecutionAddressDto(projection.executionAddress),
      review_id: `${projection.taskId}-review`,
      reviewed_submission_id: `${projection.taskId}-submission`,
      decision: 'accept',
      reviewed_at: '2026-08-10T12:02:00.000Z',
    },
  } as const;
  return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: 'TASK_DELEGATION_ACTIVATED',
      task_id: projection.taskId,
      execution_address: toTeamExecutionAddressDto(projection.executionAddress),
      sender_address: toTeamExecutionAddressDto(projection.senderAddress),
      content: projection.content,
      reference_files: [],
      created_at: projection.createdAt,
      started_at: projection.startedAt,
    },
  } as const;
};

export const taskTeamEvent = (input: {
  nested?: boolean;
  status?: TeamTaskProjectionStatus;
  taskId?: string;
  taskTeamRunIds?: string[];
  senderAddress?: TeamExecutionAddress;
  description?: string;
} = {}) => {
  const projection = taskTeamProjection(input);
  if (input.status === 'awaiting_review') return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: 'TASK_DELEGATION_RESULT_SUBMITTED',
      task_id: projection.taskId,
      execution_address: toTeamExecutionAddressDto(projection.executionAddress),
      submission_id: `${projection.taskId}-submission`,
      submitted_at: '2026-08-10T12:01:00.000Z',
    },
  } as const;
  if (input.status === 'accepted') return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: 'TASK_DELEGATION_RESULT_REVIEWED',
      task_id: projection.taskId,
      execution_address: toTeamExecutionAddressDto(projection.executionAddress),
      review_id: `${projection.taskId}-review`,
      reviewed_submission_id: `${projection.taskId}-submission`,
      decision: 'accept',
      reviewed_at: '2026-08-10T12:02:00.000Z',
    },
  } as const;
  return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: 'TASK_DELEGATION_ACTIVATED',
      task_id: projection.taskId,
      execution_address: toTeamExecutionAddressDto(projection.executionAddress),
      sender_address: toTeamExecutionAddressDto(projection.senderAddress),
      content: projection.content,
      reference_files: [],
      created_at: projection.createdAt,
      started_at: projection.startedAt,
    },
  } as const;
};

export const currentTaskExecutionRootTeamRunId = ROOT_TEAM_RUN_ID;
export const currentTaskExecutionNow = NOW;
