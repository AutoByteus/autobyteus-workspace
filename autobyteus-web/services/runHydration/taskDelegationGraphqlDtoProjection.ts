import type {
  TaskDelegationRecord,
  TaskDelegationReviewUpdate,
  TaskDelegationSubmissionUpdate,
  TaskDelegationUpdate,
} from '~/stores/taskDelegationTypes';
import { parseTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

const shapeIsExact = (
  source: Record<string, unknown>,
  keys: readonly string[],
  typename: string,
): boolean => hasExactKeys(source, keys)
  || (hasExactKeys(source, ['__typename', ...keys]) && source.__typename === typename);

const requireShape = (
  source: Record<string, unknown>,
  keys: readonly string[],
  typename: string,
  label: string,
): void => {
  if (!shapeIsExact(source, keys, typename)) throw new Error(`${label} has unsupported or missing GraphQL fields.`);
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

const optionalText = (value: unknown, label: string): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`${label} must be a string or null.`);
  return value.trim() || null;
};

const ADDRESS_KEYS = ['rootTeamRunId', 'taskTeamRunIds', 'memberAddress', 'taskAgentRunId'] as const;
const APOLLO_ADDRESS_KEYS = ['__typename', ...ADDRESS_KEYS] as const;

/** Removes only Apollo's expected address discriminator before exact domain admission. */
export const projectTaskDelegationAddressDto = (value: unknown, label = 'Task address'): TeamExecutionAddress => {
  const source = object(value, label);
  if (hasExactKeys(source, APOLLO_ADDRESS_KEYS)) {
    if (source.__typename !== 'TaskDelegationTargetAddressObject') throw new Error(`${label} has the wrong GraphQL type.`);
  } else if (!hasExactKeys(source, ADDRESS_KEYS)) {
    throw new Error(`${label} has unsupported or missing fields.`);
  }
  return parseTeamExecutionAddress({
    rootTeamRunId: source.rootTeamRunId,
    taskTeamRunIds: source.taskTeamRunIds,
    memberAddress: source.memberAddress,
    taskAgentRunId: source.taskAgentRunId,
  });
};

const projectReference = (value: unknown, label: string): TeamReferenceFile => {
  const source = object(value, label);
  requireShape(source, ['referenceId', 'path', 'type', 'createdAt', 'updatedAt'], 'TaskDelegationReferenceFileObject', label);
  const type = text(source.type, `${label}.type`);
  if (!['file', 'image', 'audio', 'video', 'pdf', 'csv', 'excel', 'other'].includes(type)) {
    throw new Error(`${label}.type is unsupported.`);
  }
  return {
    referenceId: text(source.referenceId, `${label}.referenceId`),
    path: text(source.path, `${label}.path`),
    type: type as TeamReferenceFile['type'],
    createdAt: text(source.createdAt, `${label}.createdAt`),
    updatedAt: text(source.updatedAt, `${label}.updatedAt`),
  };
};

const projectReferences = (value: unknown, label: string): TeamReferenceFile[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((entry, index) => projectReference(entry, `${label}[${index}]`));
};

const projectUpdate = (value: unknown, label: string): TaskDelegationUpdate => {
  const source = object(value, label);
  requireShape(source, [
    'kind', 'submissionId', 'reviewId', 'reviewedSubmissionId', 'decision',
    'senderAddress', 'receiverAddress', 'content', 'referenceFiles', 'createdAt',
  ], 'TaskDelegationUpdateObject', label);
  const common = {
    senderAddress: projectTaskDelegationAddressDto(source.senderAddress, `${label}.senderAddress`),
    receiverAddress: projectTaskDelegationAddressDto(source.receiverAddress, `${label}.receiverAddress`),
    referenceFiles: projectReferences(source.referenceFiles, `${label}.referenceFiles`),
    createdAt: text(source.createdAt, `${label}.createdAt`),
  };
  if (source.kind === 'submission') {
    if (source.reviewId !== null || source.reviewedSubmissionId !== null || source.decision !== null) {
      throw new Error(`${label} submission carries review-only fields.`);
    }
    return {
      kind: 'submission',
      submissionId: text(source.submissionId, `${label}.submissionId`),
      ...common,
      content: text(source.content, `${label}.content`),
    } satisfies TaskDelegationSubmissionUpdate;
  }
  if (source.kind === 'review') {
    if (source.submissionId !== null || (source.decision !== 'accept' && source.decision !== 'request_revision')) {
      throw new Error(`${label} review identity or decision is invalid.`);
    }
    return {
      kind: 'review',
      reviewId: text(source.reviewId, `${label}.reviewId`),
      reviewedSubmissionId: text(source.reviewedSubmissionId, `${label}.reviewedSubmissionId`),
      decision: source.decision,
      ...common,
      content: optionalText(source.content, `${label}.content`),
    } satisfies TaskDelegationReviewUpdate;
  }
  throw new Error(`${label}.kind is unsupported.`);
};

/** Projects one exact GraphQL result record into the transport-free domain shape. */
export const projectTaskDelegationRecordDto = (value: unknown, label = 'Task delegation record'): TaskDelegationRecord => {
  const source = object(value, label);
  requireShape(source, [
    'taskId', 'status', 'senderAddress', 'receiverAddress', 'receiverTargetKind',
    'content', 'referenceFiles', 'taskRun', 'updates', 'createdAt',
  ], 'TaskDelegationRecordObject', label);
  const status = text(source.status, `${label}.status`);
  const receiverTargetKind = source.receiverTargetKind;
  if (!['active', 'awaiting_review', 'accepted'].includes(status)) throw new Error(`${label}.status is unsupported.`);
  if (receiverTargetKind !== 'agent' && receiverTargetKind !== 'agent_team') throw new Error(`${label}.receiverTargetKind is unsupported.`);
  if (!Array.isArray(source.updates)) throw new Error(`${label}.updates must be an array.`);
  const rawTaskRun = source.taskRun === null ? null : object(source.taskRun, `${label}.taskRun`);
  if (rawTaskRun) requireShape(rawTaskRun, ['address', 'startedAt'], 'TaskDelegationTaskRunObject', `${label}.taskRun`);
  return {
    taskId: text(source.taskId, `${label}.taskId`),
    status: status as TaskDelegationRecord['status'],
    senderAddress: projectTaskDelegationAddressDto(source.senderAddress, `${label}.senderAddress`),
    receiverAddress: projectTaskDelegationAddressDto(source.receiverAddress, `${label}.receiverAddress`),
    receiverTargetKind,
    content: text(source.content, `${label}.content`),
    referenceFiles: projectReferences(source.referenceFiles, `${label}.referenceFiles`),
    taskRun: rawTaskRun ? {
      address: projectTaskDelegationAddressDto(rawTaskRun.address, `${label}.taskRun.address`),
      startedAt: text(rawTaskRun.startedAt, `${label}.taskRun.startedAt`),
    } : null,
    updates: source.updates.map((entry, index) => projectUpdate(entry, `${label}.updates[${index}]`)),
    createdAt: text(source.createdAt, `${label}.createdAt`),
  };
};

/** One invalid row rejects the complete root-scoped GraphQL collection. */
export const projectTaskDelegationRecordDtos = (values: unknown): TaskDelegationRecord[] => {
  if (!Array.isArray(values)) throw new Error('Task delegation GraphQL response must be an array.');
  return values.map((value, index) => projectTaskDelegationRecordDto(value, `Task delegation record[${index}]`));
};
