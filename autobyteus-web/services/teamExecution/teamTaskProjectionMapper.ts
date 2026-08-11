import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import {
  createTeamExecutionAddress,
  sameTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type { TeamTopologySnapshot } from './teamTopologySnapshot';
import type {
  TeamTaskProjection,
  TeamTaskProjectionSnapshot,
  TeamTaskUpdateProjection,
} from './teamExecutionModels';

const cloneAddress = (address: TeamExecutionAddress): TeamExecutionAddress => createTeamExecutionAddress(address);

const assertRoot = (address: TeamExecutionAddress, rootTeamRunId: string, subject: string): void => {
  if (address.rootTeamRunId !== rootTeamRunId) throw new Error(`${subject} belongs to another root TeamRun.`);
};

const lastUpdatedAt = (record: TaskDelegationRecord): string =>
  record.updates.at(-1)?.createdAt ?? record.taskRun?.startedAt ?? record.createdAt;

const mapUpdate = (
  update: TaskDelegationRecord['updates'][number],
  rootTeamRunId: string,
): TeamTaskUpdateProjection => {
  assertRoot(update.senderAddress, rootTeamRunId, 'Task update sender');
  assertRoot(update.receiverAddress, rootTeamRunId, 'Task update receiver');
  return Object.freeze({
    kind: update.kind,
    id: update.kind === 'submission' ? update.submissionId : update.reviewId,
    senderAddress: cloneAddress(update.senderAddress),
    receiverAddress: cloneAddress(update.receiverAddress),
    content: update.content,
    createdAt: update.createdAt,
    decision: update.kind === 'review' ? update.decision : null,
    referenceFiles: Object.freeze(update.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
  });
};

const expectedAgentReceiver = (address: TeamExecutionAddress): TeamExecutionAddress =>
  createTeamExecutionAddress({ ...address, taskAgentRunId: null });

const expectedTeamReceiver = (
  address: TeamExecutionAddress,
  topology: TeamTopologySnapshot,
): TeamExecutionAddress => {
  const node = topology.getNode(address.memberAddress);
  if (!node || node.kind !== 'agent_team') throw new Error(`Task '${address.memberAddress}' is not an AgentTeam target.`);
  return createTeamExecutionAddress({
    rootTeamRunId: address.rootTeamRunId,
    taskTeamRunIds: address.taskTeamRunIds,
    memberAddress: node.coordinatorAddress,
    taskAgentRunId: null,
  });
};

export const mapCompleteTeamTaskProjectionSnapshot = (input: {
  expectedRootTeamRunId: string;
  topology: TeamTopologySnapshot;
  records: readonly TaskDelegationRecord[];
}): TeamTaskProjectionSnapshot => {
  const taskIds = new Set<string>();
  const executionKeys = new Set<string>();
  const tasks: TeamTaskProjection[] = input.records.map((record) => {
    const taskRun = record.taskRun;
    const address = taskRun?.address;
    if (!taskRun || !address) throw new Error(`Task '${record.taskId}' has no concrete taskRun.address.`);
    if (address.rootTeamRunId !== input.expectedRootTeamRunId) throw new Error(`Task '${record.taskId}' belongs to another root TeamRun.`);
    assertRoot(record.senderAddress, input.expectedRootTeamRunId, `Task '${record.taskId}' sender`);
    assertRoot(record.receiverAddress, input.expectedRootTeamRunId, `Task '${record.taskId}' receiver`);
    if (taskIds.has(record.taskId)) throw new Error(`Duplicate task '${record.taskId}'.`);
    taskIds.add(record.taskId);
    const executionKey = serializeTeamExecutionAddress(address);
    if (executionKeys.has(executionKey)) throw new Error(`Duplicate task execution '${executionKey}'.`);
    executionKeys.add(executionKey);
    const expectedReceiver = record.receiverTargetKind === 'agent'
      ? expectedAgentReceiver(address)
      : expectedTeamReceiver(address, input.topology);
    if (!sameTeamExecutionAddress(record.receiverAddress, expectedReceiver)) {
      throw new Error(`Task '${record.taskId}' receiver does not match its configured target.`);
    }
    if (record.receiverTargetKind === 'agent' && !address.taskAgentRunId) {
      throw new Error(`Task '${record.taskId}' Agent execution is missing its task Agent run ID.`);
    }
    if (record.receiverTargetKind === 'agent_team' && (address.taskAgentRunId || address.taskTeamRunIds.length === 0)) {
      throw new Error(`Task '${record.taskId}' AgentTeam execution chain is invalid.`);
    }
    return Object.freeze({
      taskId: record.taskId,
      executionAddress: cloneAddress(address),
      status: record.status,
      senderAddress: cloneAddress(record.senderAddress),
      content: record.content,
      referenceFiles: Object.freeze(record.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
      createdAt: record.createdAt,
      startedAt: taskRun.startedAt,
      updatedAt: lastUpdatedAt(record),
      updates: Object.freeze(record.updates.map((update) => mapUpdate(update, input.expectedRootTeamRunId))),
    });
  });
  return Object.freeze({ kind: 'complete_root_task_snapshot', tasks: Object.freeze(tasks) });
};
