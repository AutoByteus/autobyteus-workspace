import {
  taskDelegationRecordDtoSchema,
  type TaskDelegationRecordDto,
  type TeamReferenceFileDto,
} from '@autobyteus/team-stream-contracts';

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};

const exactGraphqlShape = (
  value: Record<string, unknown>,
  fields: readonly string[],
  typename: string,
  label: string,
): void => {
  const expected = new Set(fields);
  const keys = Object.keys(value);
  if (keys.includes('__typename')) {
    if (value.__typename !== typename) throw new Error(`${label} has the wrong GraphQL type.`);
    expected.add('__typename');
  }
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) {
    throw new Error(`${label} has unsupported or missing GraphQL fields.`);
  }
};

const text = (value: unknown, label: string, allowEmpty = false): string => {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error(`${label} is required.`);
  return allowEmpty ? value : value.trim();
};

const nullableText = (value: unknown, label: string): string | null => {
  if (value === null) return null;
  return text(value, label, true);
};

const references = (value: unknown, label: string): TeamReferenceFileDto[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((entry, index) => {
    const reference = object(entry, `${label}[${index}]`);
    exactGraphqlShape(reference, ['referenceId', 'path', 'type', 'createdAt', 'updatedAt'], 'TaskDelegationReferenceFileObject', `${label}[${index}]`);
    return {
      reference_id: text(reference.referenceId, `${label}[${index}].referenceId`),
      path: text(reference.path, `${label}[${index}].path`),
      type: text(reference.type, `${label}[${index}].type`) as TeamReferenceFileDto['type'],
      created_at: text(reference.createdAt, `${label}[${index}].createdAt`),
      updated_at: text(reference.updatedAt, `${label}[${index}].updatedAt`),
    };
  });
};

const projectUpdate = (value: unknown, label: string): TaskDelegationRecordDto['updates'][number] => {
  const source = object(value, label);
  exactGraphqlShape(source, [
    'kind', 'submissionId', 'reviewId', 'interruptionId', 'reviewedSubmissionId',
    'decision', 'content', 'referenceFiles', 'createdAt',
  ], 'TaskDelegationUpdateObject', label);
  const createdAt = text(source.createdAt, `${label}.createdAt`);
  if (source.kind === 'submission') return {
    kind: 'submission',
    submission_id: text(source.submissionId, `${label}.submissionId`),
    message: text(source.content, `${label}.content`),
    reference_files: references(source.referenceFiles, `${label}.referenceFiles`),
    created_at: createdAt,
  };
  if (source.kind === 'review') {
    if (source.decision !== 'accept' && source.decision !== 'request_revision') {
      throw new Error(`${label}.decision is unsupported.`);
    }
    return {
      kind: 'review',
      review_id: text(source.reviewId, `${label}.reviewId`),
      reviewed_submission_id: text(source.reviewedSubmissionId, `${label}.reviewedSubmissionId`),
      decision: source.decision,
      comment: nullableText(source.content, `${label}.content`),
      reference_files: references(source.referenceFiles, `${label}.referenceFiles`),
      created_at: createdAt,
    };
  }
  if (source.kind === 'interruption') return {
    kind: 'interruption',
    interruption_id: text(source.interruptionId, `${label}.interruptionId`),
    reason: text(source.content, `${label}.content`),
    created_at: createdAt,
  };
  throw new Error(`${label}.kind is unsupported.`);
};

export const projectTaskDelegationRecordDto = (
  value: unknown,
  label = 'Task delegation record',
): TaskDelegationRecordDto => {
  const source = object(value, label);
  exactGraphqlShape(source, [
    'taskId', 'delegatorAgentRunId', 'recipientAddress', 'targetAgentRunId',
    'targetTeamRunId', 'description', 'referenceFiles', 'status', 'updates', 'createdAt',
  ], 'TaskDelegationRecordObject', label);
  const targetAgentRunId = source.targetAgentRunId === null
    ? null
    : text(source.targetAgentRunId, `${label}.targetAgentRunId`);
  const targetTeamRunId = source.targetTeamRunId === null
    ? null
    : text(source.targetTeamRunId, `${label}.targetTeamRunId`);
  if ((targetAgentRunId === null) === (targetTeamRunId === null)) {
    throw new Error(`${label} must have exactly one task execution target.`);
  }
  if (!Array.isArray(source.updates)) throw new Error(`${label}.updates must be an array.`);
  return taskDelegationRecordDtoSchema.parse({
    task_id: text(source.taskId, `${label}.taskId`),
    delegator_agent_run_id: text(source.delegatorAgentRunId, `${label}.delegatorAgentRunId`),
    recipient_address: text(source.recipientAddress, `${label}.recipientAddress`),
    task_execution: targetAgentRunId ? { agent_run_id: targetAgentRunId } : { team_run_id: targetTeamRunId },
    description: text(source.description, `${label}.description`),
    reference_files: references(source.referenceFiles, `${label}.referenceFiles`),
    status: text(source.status, `${label}.status`),
    updates: source.updates.map((entry, index) => projectUpdate(entry, `${label}.updates[${index}]`)),
    created_at: text(source.createdAt, `${label}.createdAt`),
  });
};

export const projectTaskDelegationRecordDtos = (values: unknown): TaskDelegationRecordDto[] => {
  if (!Array.isArray(values)) throw new Error('Task delegation GraphQL response must be an array.');
  return values.map((value, index) => projectTaskDelegationRecordDto(value, `Task delegation record[${index}]`));
};
