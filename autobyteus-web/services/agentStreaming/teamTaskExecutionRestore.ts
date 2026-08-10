import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import type { TaskDelegationProjectionDetails, TaskExecutionProjectionStatus } from './teamTaskExecutionProjection';
import { ensureTaskAgentProjection, type TaskAgentStreamIdentity } from './teamTaskAgentContextProjection';
import { ensureTaskTeamExecutionProjection } from './teamTaskTeamExecutionProjection';
import { applyTaskDelegationProjectionDetails } from './teamTaskExecutionProjection';

const statusFor = (record: TaskDelegationRecord): TaskExecutionProjectionStatus =>
  record.status === 'awaiting_review' ? 'awaiting_review' : record.status === 'accepted' ? 'accepted' : 'active';

const detailsFor = (record: TaskDelegationRecord): TaskDelegationProjectionDetails => ({
  taskId: record.taskId,
  taskLabel: record.taskId,
  taskDescription: record.content,
  taskReferenceFiles: record.referenceFiles.map((entry) => ({ ...entry })),
  taskArguments: {
    target: { kind: record.receiverTargetKind, address: record.receiverAddress.memberAddress },
    description: record.content,
    reference_files: record.referenceFiles.map((entry) => entry.path),
  },
  taskTargetKind: record.receiverTargetKind,
  taskTargetAddress: record.receiverAddress.memberAddress,
  taskExecutionStatus: statusFor(record),
  eventType: 'TASK_DELEGATION_RESTORED',
  occurredAt: record.createdAt,
  message: null,
});

/** Recreates only non-terminal task executions from exact persisted task-run addresses. */
export const restoreTaskExecutionProjections = (
  team: AgentTeamContext,
  records: readonly TaskDelegationRecord[],
): void => {
  const active = records
    .filter((record) => record.status !== 'accepted' && record.taskRun?.address.rootTeamRunId === team.teamRunId)
    .sort((left, right) => {
      const depth = (left.taskRun?.address.taskTeamRunIds.length ?? 0) - (right.taskRun?.address.taskTeamRunIds.length ?? 0);
      return depth || left.createdAt.localeCompare(right.createdAt) || left.taskId.localeCompare(right.taskId);
    });
  for (const record of active) {
    const address = record.taskRun?.address;
    if (!address) continue;
    const details = detailsFor(record);
    if (record.receiverTargetKind === 'agent' && address.taskAgentRunId) {
      ensureTaskAgentProjection(team, {
        executionAddress: address,
        taskAgentRunId: address.taskAgentRunId,
      } satisfies TaskAgentStreamIdentity, details);
      continue;
    }
    if (record.receiverTargetKind === 'agent_team' && !address.taskAgentRunId && address.taskTeamRunIds.length) {
      const ensured = ensureTaskTeamExecutionProjection(team, { executionAddress: address });
      if (ensured) applyTaskDelegationProjectionDetails(ensured.node, details);
    }
  }
};
