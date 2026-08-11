import {
  createTeamExecutionAddress,
  sameTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type { TeamTaskProjection, TeamTaskUpdateProjection } from './teamExecutionModels';
import type { TeamTopologySnapshot } from './teamTopologySnapshot';

const sameJson = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const cloneAddress = (address: TeamExecutionAddress): TeamExecutionAddress => createTeamExecutionAddress(address);

export const cloneTeamTaskProjection = (task: TeamTaskProjection): TeamTaskProjection => Object.freeze({
  ...task,
  executionAddress: cloneAddress(task.executionAddress),
  senderAddress: cloneAddress(task.senderAddress),
  referenceFiles: Object.freeze(task.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
  updates: Object.freeze(task.updates.map((update) => Object.freeze({
    ...update,
    senderAddress: cloneAddress(update.senderAddress),
    receiverAddress: cloneAddress(update.receiverAddress),
    referenceFiles: Object.freeze(update.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
  }))),
});

export const equivalentTeamTaskProjection = (left: TeamTaskProjection, right: TeamTaskProjection): boolean =>
  sameJson(left, right);

export const sameImmutableTeamTaskBase = (left: TeamTaskProjection, right: TeamTaskProjection): boolean =>
  sameTeamExecutionAddress(left.executionAddress, right.executionAddress)
  && sameTeamExecutionAddress(left.senderAddress, right.senderAddress)
  && left.createdAt === right.createdAt
  && left.startedAt === right.startedAt
  && left.content === right.content
  && sameJson(left.referenceFiles, right.referenceFiles);

export const taskUpdatesExtendExactly = (previous: TeamTaskProjection, next: TeamTaskProjection): boolean =>
  next.updates.length >= previous.updates.length
  && previous.updates.every((update, index) => sameJson(update, next.updates[index]));

const assertRoot = (address: TeamExecutionAddress, rootTeamRunId: string, label: string): void => {
  if (address.rootTeamRunId !== rootTeamRunId) throw new Error(`${label} belongs to another root TeamRun.`);
};

const requiredId = (value: string, label: string): void => {
  if (!value.trim()) throw new Error(`${label} is empty.`);
};

const timestamp = (value: string, label: string): number => {
  const parsed = Date.parse(value);
  if (!value.trim() || !Number.isFinite(parsed)) throw new Error(`${label} is invalid.`);
  return parsed;
};

const validateUpdateTimeline = (task: TeamTaskProjection): void => {
  const submissionIds = new Set<string>();
  const reviewIds = new Set<string>();
  let pendingSubmissionId: string | null = null;
  let priorCreatedAt = timestamp(task.startedAt, `Task '${task.taskId}' startedAt`);
  let expectedStatus: TeamTaskProjection['status'] = 'active';
  task.updates.forEach((update: TeamTaskUpdateProjection, index) => {
    const label = `Task '${task.taskId}' update[${index}]`;
    assertRoot(update.senderAddress, task.executionAddress.rootTeamRunId, `${label} sender`);
    assertRoot(update.receiverAddress, task.executionAddress.rootTeamRunId, `${label} receiver`);
    const updateCreatedAt = timestamp(update.createdAt, `${label} createdAt`);
    if (updateCreatedAt < priorCreatedAt) throw new Error(`${label} is out of order.`);
    priorCreatedAt = updateCreatedAt;
    if (update.kind === 'submission') {
      requiredId(update.submissionId, `${label} submissionId`);
      if (!update.content.trim()) throw new Error(`${label} content is empty.`);
      if (pendingSubmissionId || submissionIds.has(update.submissionId)
        || !sameTeamExecutionAddress(update.senderAddress, task.executionAddress)
        || !sameTeamExecutionAddress(update.receiverAddress, task.senderAddress)) {
        throw new Error(`${label} has invalid submission identity or participants.`);
      }
      submissionIds.add(update.submissionId);
      pendingSubmissionId = update.submissionId;
      expectedStatus = 'awaiting_review';
      return;
    }
    if (update.kind !== 'review' || (update.decision !== 'accept' && update.decision !== 'request_revision')) {
      throw new Error(`${label} has an unsupported update kind or decision.`);
    }
    requiredId(update.reviewId, `${label} reviewId`);
    requiredId(update.reviewedSubmissionId, `${label} reviewedSubmissionId`);
    if (!pendingSubmissionId || reviewIds.has(update.reviewId)
      || update.reviewedSubmissionId !== pendingSubmissionId
      || !sameTeamExecutionAddress(update.senderAddress, task.senderAddress)
      || !sameTeamExecutionAddress(update.receiverAddress, task.executionAddress)) {
      throw new Error(`${label} has invalid review identity, order, or participants.`);
    }
    reviewIds.add(update.reviewId);
    pendingSubmissionId = null;
    expectedStatus = update.decision === 'accept' ? 'accepted' : 'active';
    if (expectedStatus === 'accepted' && index !== task.updates.length - 1) {
      throw new Error(`${label} accepts the task before the end of its timeline.`);
    }
  });
  if (task.status !== expectedStatus || task.updatedAt !== (task.updates.at(-1)?.createdAt ?? task.startedAt)) {
    throw new Error(`Task '${task.taskId}' status or updatedAt does not match its ordered timeline.`);
  }
};

export const assertTeamTaskProjectionIntegrity = (input: {
  task: TeamTaskProjection;
  rootTeamRunId: string;
  topology: TeamTopologySnapshot;
}): void => {
  const { task } = input;
  requiredId(task.taskId, 'Task ID');
  if (!task.content.trim()) throw new Error('Task projection has empty required facts.');
  if (task.status !== 'active' && task.status !== 'awaiting_review' && task.status !== 'accepted') {
    throw new Error(`Task '${task.taskId}' has an unsupported status.`);
  }
  assertRoot(task.executionAddress, input.rootTeamRunId, `Task '${task.taskId}'`);
  assertRoot(task.senderAddress, input.rootTeamRunId, `Task '${task.taskId}' sender`);
  const senderNode = input.topology.getNode(task.senderAddress.memberAddress);
  if (!senderNode || senderNode.kind !== 'agent') throw new Error(`Task '${task.taskId}' sender is not a topology Agent.`);
  const targetNode = input.topology.getNode(task.executionAddress.memberAddress);
  if (task.executionAddress.taskAgentRunId) {
    if (!targetNode || targetNode.kind !== 'agent') throw new Error(`Task '${task.taskId}' target is not a topology Agent.`);
  } else if (task.executionAddress.taskTeamRunIds.length > 0) {
    if (!targetNode || targetNode.kind !== 'agent_team') throw new Error(`Task '${task.taskId}' target is not a topology AgentTeam.`);
  } else {
    throw new Error(`Task '${task.taskId}' has no concrete task identity.`);
  }
  const createdAt = timestamp(task.createdAt, `Task '${task.taskId}' createdAt`);
  const startedAt = timestamp(task.startedAt, `Task '${task.taskId}' startedAt`);
  timestamp(task.updatedAt, `Task '${task.taskId}' updatedAt`);
  if (new Set(task.executionAddress.taskTeamRunIds).size !== task.executionAddress.taskTeamRunIds.length) {
    throw new Error(`Task '${task.taskId}' repeats a task Team run ID in its ordered chain.`);
  }
  if (createdAt > startedAt) throw new Error(`Task '${task.taskId}' starts before it was created.`);
  validateUpdateTimeline(task);
};
