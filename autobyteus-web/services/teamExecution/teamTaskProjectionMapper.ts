import type { TaskDelegationRecord, TaskDelegationUpdate } from '~/stores/taskDelegationTypes';
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
const chainKey = (ids: readonly string[]): string => JSON.stringify(ids);
const memberBelongsToTeam = (memberAddress: string, teamAddress: string): boolean =>
  teamAddress === '/' ? memberAddress !== '/' : memberAddress.startsWith(`${teamAddress}/`);
const requiredId = (value: string, label: string): void => {
  if (!value.trim()) throw new Error(`${label} is empty.`);
};
const validTimestamp = (value: string, label: string): void => {
  if (!value.trim() || !Number.isFinite(Date.parse(value))) throw new Error(`${label} is invalid.`);
};

const assertRoot = (address: TeamExecutionAddress, rootTeamRunId: string, subject: string): void => {
  if (address.rootTeamRunId !== rootTeamRunId) throw new Error(`${subject} belongs to another root TeamRun.`);
};

const expectedAgentReceiver = (address: TeamExecutionAddress): TeamExecutionAddress =>
  createTeamExecutionAddress({ ...address, taskAgentRunId: null });

const expectedTeamReceiver = (
  address: TeamExecutionAddress,
  topology: TeamTopologySnapshot,
): TeamExecutionAddress => {
  const node = topology.getNode(address.memberAddress);
  if (!node || node.kind !== 'agent_team') throw new Error(`Task '${address.memberAddress}' is not an AgentTeam target.`);
  const coordinator = topology.getNode(node.coordinatorAddress);
  if (!coordinator || coordinator.kind !== 'agent' || !memberBelongsToTeam(coordinator.address, node.address)) {
    throw new Error(`Task Team '${address.memberAddress}' has an invalid configured coordinator.`);
  }
  return createTeamExecutionAddress({
    rootTeamRunId: address.rootTeamRunId,
    taskTeamRunIds: address.taskTeamRunIds,
    memberAddress: node.coordinatorAddress,
    taskAgentRunId: null,
  });
};

const assertAgentParticipant = (input: {
  address: TeamExecutionAddress;
  label: string;
  rootTeamRunId: string;
  topology: TeamTopologySnapshot;
  priorTaskExecutions: ReadonlySet<string>;
  priorTaskTeams: ReadonlyMap<string, TeamExecutionAddress>;
}): void => {
  assertRoot(input.address, input.rootTeamRunId, input.label);
  const node = input.topology.getNode(input.address.memberAddress);
  if (!node || node.kind !== 'agent') throw new Error(`${input.label} is not a topology Agent.`);
  if (input.address.taskAgentRunId) {
    if (!input.priorTaskExecutions.has(serializeTeamExecutionAddress(input.address))) {
      throw new Error(`${input.label} references a task Agent that is not parent-before-child.`);
    }
    return;
  }
  if (input.address.taskTeamRunIds.length > 0) {
    const containing = input.priorTaskTeams.get(chainKey(input.address.taskTeamRunIds));
    if (!containing || !memberBelongsToTeam(input.address.memberAddress, containing.memberAddress)) {
      throw new Error(`${input.label} is outside its exact active task Team chain.`);
    }
  }
};

const mapAndValidateUpdates = (input: {
  record: TaskDelegationRecord;
  executionAddress: TeamExecutionAddress;
  rootTeamRunId: string;
}): readonly TeamTaskUpdateProjection[] => {
  const submissionIds = new Set<string>();
  const reviewIds = new Set<string>();
  let pendingSubmissionId: string | null = null;
  let previousCreatedAt = Date.parse(input.record.taskRun!.startedAt);
  let expectedStatus: TaskDelegationRecord['status'] = 'active';
  const updates = input.record.updates.map((update: TaskDelegationUpdate, index): TeamTaskUpdateProjection => {
    const label = `Task '${input.record.taskId}' update[${index}]`;
    assertRoot(update.senderAddress, input.rootTeamRunId, `${label} sender`);
    assertRoot(update.receiverAddress, input.rootTeamRunId, `${label} receiver`);
    validTimestamp(update.createdAt, `${label} createdAt`);
    const updateCreatedAt = Date.parse(update.createdAt);
    if (updateCreatedAt < previousCreatedAt) throw new Error(`${label} is out of order.`);
    previousCreatedAt = updateCreatedAt;
    const common = {
      senderAddress: cloneAddress(update.senderAddress),
      receiverAddress: cloneAddress(update.receiverAddress),
      createdAt: update.createdAt,
      referenceFiles: Object.freeze(update.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
    };
    if (update.kind === 'submission') {
      requiredId(update.submissionId, `${label} submissionId`);
      if (pendingSubmissionId || submissionIds.has(update.submissionId)
        || !sameTeamExecutionAddress(update.senderAddress, input.executionAddress)
        || !sameTeamExecutionAddress(update.receiverAddress, input.record.senderAddress)) {
        throw new Error(`${label} has invalid submission identity or participants.`);
      }
      submissionIds.add(update.submissionId);
      pendingSubmissionId = update.submissionId;
      expectedStatus = 'awaiting_review';
      return Object.freeze({
        kind: 'submission', submissionId: update.submissionId, ...common, content: update.content,
      });
    }
    requiredId(update.reviewId, `${label} reviewId`);
    requiredId(update.reviewedSubmissionId, `${label} reviewedSubmissionId`);
    if (!pendingSubmissionId || reviewIds.has(update.reviewId)
      || update.reviewedSubmissionId !== pendingSubmissionId
      || !sameTeamExecutionAddress(update.senderAddress, input.record.senderAddress)
      || !sameTeamExecutionAddress(update.receiverAddress, input.executionAddress)) {
      throw new Error(`${label} has invalid review identity, order, or participants.`);
    }
    reviewIds.add(update.reviewId);
    pendingSubmissionId = null;
    expectedStatus = update.decision === 'accept' ? 'accepted' : 'active';
    if (expectedStatus === 'accepted' && index !== input.record.updates.length - 1) {
      throw new Error(`${label} accepts the task before the end of its timeline.`);
    }
    return Object.freeze({
      kind: 'review', reviewId: update.reviewId, reviewedSubmissionId: update.reviewedSubmissionId,
      decision: update.decision, ...common, content: update.content,
    });
  });
  if (input.record.status !== expectedStatus) {
    throw new Error(`Task '${input.record.taskId}' status does not match its ordered update timeline.`);
  }
  return Object.freeze(updates);
};

export const mapCompleteTeamTaskProjectionSnapshot = (input: {
  expectedRootTeamRunId: string;
  topology: TeamTopologySnapshot;
  records: readonly TaskDelegationRecord[];
}): TeamTaskProjectionSnapshot => {
  const taskIds = new Set<string>();
  const executionKeys = new Set<string>();
  const priorTaskTeams = new Map<string, TeamExecutionAddress>();
  const tasks: TeamTaskProjection[] = [];

  input.records.forEach((record) => {
    const taskRun = record.taskRun;
    const address = taskRun?.address;
    if (!taskRun || !address) throw new Error(`Task '${record.taskId}' has no concrete taskRun.address.`);
    requiredId(record.taskId, 'Task ID');
    validTimestamp(record.createdAt, `Task '${record.taskId}' createdAt`);
    validTimestamp(taskRun.startedAt, `Task '${record.taskId}' startedAt`);
    assertRoot(address, input.expectedRootTeamRunId, `Task '${record.taskId}'`);
    assertRoot(record.receiverAddress, input.expectedRootTeamRunId, `Task '${record.taskId}' receiver`);
    if (Date.parse(record.createdAt) > Date.parse(taskRun.startedAt)) throw new Error(`Task '${record.taskId}' starts before it was created.`);
    if (new Set(address.taskTeamRunIds).size !== address.taskTeamRunIds.length) {
      throw new Error(`Task '${record.taskId}' repeats a task Team run ID in its ordered chain.`);
    }
    if (taskIds.has(record.taskId)) throw new Error(`Duplicate task '${record.taskId}'.`);
    taskIds.add(record.taskId);
    const executionKey = serializeTeamExecutionAddress(address);
    if (executionKeys.has(executionKey)) throw new Error(`Duplicate task execution '${executionKey}'.`);

    assertAgentParticipant({
      address: record.senderAddress,
      label: `Task '${record.taskId}' sender`,
      rootTeamRunId: input.expectedRootTeamRunId,
      topology: input.topology,
      priorTaskExecutions: executionKeys,
      priorTaskTeams,
    });
    executionKeys.add(executionKey);

    const targetNode = input.topology.getNode(address.memberAddress);
    if (record.receiverTargetKind === 'agent') {
      if (!targetNode || targetNode.kind !== 'agent' || !address.taskAgentRunId) {
        throw new Error(`Task '${record.taskId}' has an invalid Agent target execution.`);
      }
      if (address.taskTeamRunIds.length > 0) {
        const containing = priorTaskTeams.get(chainKey(address.taskTeamRunIds));
        if (!containing || !memberBelongsToTeam(address.memberAddress, containing.memberAddress)) {
          throw new Error(`Task '${record.taskId}' Agent target is outside its exact parent task Team.`);
        }
      }
    } else {
      if (!targetNode || targetNode.kind !== 'agent_team' || address.taskAgentRunId || address.taskTeamRunIds.length === 0) {
        throw new Error(`Task '${record.taskId}' has an invalid AgentTeam target execution.`);
      }
      if (address.taskTeamRunIds.length > 1) {
        const parent = priorTaskTeams.get(chainKey(address.taskTeamRunIds.slice(0, -1)));
        if (!parent || !memberBelongsToTeam(address.memberAddress, parent.memberAddress)) {
          throw new Error(`Task '${record.taskId}' has no exact containing parent task Team.`);
        }
      }
      const key = chainKey(address.taskTeamRunIds);
      if (priorTaskTeams.has(key)) throw new Error(`Task '${record.taskId}' reuses a task Team run chain.`);
      priorTaskTeams.set(key, cloneAddress(address));
    }

    const expectedReceiver = record.receiverTargetKind === 'agent'
      ? expectedAgentReceiver(address)
      : expectedTeamReceiver(address, input.topology);
    if (!sameTeamExecutionAddress(record.receiverAddress, expectedReceiver)) {
      throw new Error(`Task '${record.taskId}' receiver does not match its configured target.`);
    }
    const updates = mapAndValidateUpdates({ record, executionAddress: address, rootTeamRunId: input.expectedRootTeamRunId });
    tasks.push(Object.freeze({
      taskId: record.taskId,
      executionAddress: cloneAddress(address),
      status: record.status,
      senderAddress: cloneAddress(record.senderAddress),
      content: record.content,
      referenceFiles: Object.freeze(record.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
      createdAt: record.createdAt,
      startedAt: taskRun.startedAt,
      updatedAt: updates.at(-1)?.createdAt ?? taskRun.startedAt,
      updates,
    }));
  });
  return Object.freeze({ kind: 'complete_root_task_snapshot', tasks: Object.freeze(tasks) });
};
