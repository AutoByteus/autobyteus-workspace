import { normalizeTaskDelegationRecord } from '~/stores/taskDelegationStore';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import { parseTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

const ADDRESS_KEYS = ['rootTeamRunId', 'taskTeamRunIds', 'memberAddress', 'taskAgentRunId'] as const;
const APOLLO_ADDRESS_KEYS = ['__typename', ...ADDRESS_KEYS] as const;
const shapeIsExact = (
  source: Record<string, unknown>,
  keys: readonly string[],
  typename: string,
): boolean => hasExactKeys(source, keys)
  || (hasExactKeys(source, ['__typename', ...keys]) && source.__typename === typename);

/**
 * Removes Apollo's one transport-only discriminator before the exact domain
 * parser runs. No other surplus field or transport shape is admitted here.
 */
export const projectTaskDelegationAddressDto = (value: unknown): TeamExecutionAddress | null => {
  const source = object(value);
  if (!source) return null;
  if (hasExactKeys(source, APOLLO_ADDRESS_KEYS)) {
    if (source.__typename !== 'TaskDelegationTargetAddressObject') return null;
  } else if (!hasExactKeys(source, ADDRESS_KEYS)) {
    return null;
  }
  try {
    return parseTeamExecutionAddress({
      rootTeamRunId: source.rootTeamRunId,
      taskTeamRunIds: source.taskTeamRunIds,
      memberAddress: source.memberAddress,
      taskAgentRunId: source.taskAgentRunId,
    });
  } catch {
    return null;
  }
};

const projectReference = (value: unknown): Record<string, unknown> | null => {
  const source = object(value);
  const keys = ['referenceId', 'path', 'type', 'createdAt', 'updatedAt'];
  if (!source || !shapeIsExact(source, keys, 'TaskDelegationReferenceFileObject')) return null;
  return {
    referenceId: source.referenceId,
    path: source.path,
    type: source.type,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const projectReferences = (value: unknown): Record<string, unknown>[] | null => {
  if (!Array.isArray(value)) return null;
  const projected = value.map(projectReference);
  return projected.some((entry) => !entry) ? null : projected as Record<string, unknown>[];
};

const projectUpdate = (value: unknown): Record<string, unknown> | null => {
  const source = object(value);
  const keys = [
    'kind', 'submissionId', 'reviewId', 'reviewedSubmissionId', 'decision',
    'senderAddress', 'receiverAddress', 'content', 'referenceFiles', 'createdAt',
  ];
  if (!source || !shapeIsExact(source, keys, 'TaskDelegationUpdateObject')) return null;
  const senderAddress = projectTaskDelegationAddressDto(source?.senderAddress);
  const receiverAddress = projectTaskDelegationAddressDto(source?.receiverAddress);
  const referenceFiles = projectReferences(source?.referenceFiles);
  if (!senderAddress || !receiverAddress || !referenceFiles) return null;
  return {
    kind: source.kind,
    submissionId: source.submissionId,
    reviewId: source.reviewId,
    reviewedSubmissionId: source.reviewedSubmissionId,
    decision: source.decision,
    senderAddress,
    receiverAddress,
    content: source.content,
    referenceFiles,
    createdAt: source.createdAt,
  };
};

/** Projects one GraphQL result record into the transport-free domain shape. */
export const projectTaskDelegationRecordDto = (value: unknown): TaskDelegationRecord | null => {
  const source = object(value);
  const keys = [
    'taskId', 'status', 'senderAddress', 'receiverAddress', 'receiverTargetKind',
    'content', 'referenceFiles', 'taskRun', 'updates', 'createdAt',
  ];
  if (!source || !shapeIsExact(source, keys, 'TaskDelegationRecordObject')) return null;
  const senderAddress = projectTaskDelegationAddressDto(source?.senderAddress);
  const receiverAddress = projectTaskDelegationAddressDto(source?.receiverAddress);
  const referenceFiles = projectReferences(source?.referenceFiles);
  if (!senderAddress || !receiverAddress || !referenceFiles || !Array.isArray(source.updates)) return null;
  const updates = source.updates.map(projectUpdate);
  if (updates.some((entry) => !entry)) return null;
  const rawTaskRun = source.taskRun === null ? null : object(source.taskRun);
  if (rawTaskRun && !shapeIsExact(rawTaskRun, ['address', 'startedAt'], 'TaskDelegationTaskRunObject')) return null;
  const taskRunAddress = rawTaskRun ? projectTaskDelegationAddressDto(rawTaskRun.address) : null;
  if (source.taskRun !== null && (!rawTaskRun || !taskRunAddress)) return null;
  return normalizeTaskDelegationRecord({
    taskId: source.taskId,
    status: source.status,
    senderAddress,
    receiverAddress,
    receiverTargetKind: source.receiverTargetKind,
    content: source.content,
    referenceFiles,
    taskRun: rawTaskRun ? { address: taskRunAddress, startedAt: rawTaskRun.startedAt } : null,
    updates,
    createdAt: source.createdAt,
  });
};

export const projectTaskDelegationRecordDtos = (values: unknown): TaskDelegationRecord[] =>
  Array.isArray(values)
    ? values.map(projectTaskDelegationRecordDto).filter((record): record is TaskDelegationRecord => Boolean(record))
    : [];
