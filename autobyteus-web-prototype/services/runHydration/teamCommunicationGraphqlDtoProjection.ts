import {
  teamCommunicationMessageDtoSchema,
  type TeamCommunicationMessageDto,
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

const references = (value: unknown, label: string): TeamReferenceFileDto[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((entry, index) => {
    const reference = object(entry, `${label}[${index}]`);
    exactGraphqlShape(reference, ['referenceId', 'path', 'type', 'createdAt', 'updatedAt'], 'TeamCommunicationReferenceFileObject', `${label}[${index}]`);
    return {
      reference_id: text(reference.referenceId, `${label}[${index}].referenceId`),
      path: text(reference.path, `${label}[${index}].path`),
      type: text(reference.type, `${label}[${index}].type`) as TeamReferenceFileDto['type'],
      created_at: text(reference.createdAt, `${label}[${index}].createdAt`),
      updated_at: text(reference.updatedAt, `${label}[${index}].updatedAt`),
    };
  });
};

export const projectTeamCommunicationMessageDto = (
  value: unknown,
  label = 'Team communication message',
): TeamCommunicationMessageDto => {
  const source = object(value, label);
  exactGraphqlShape(source, [
    'messageId', 'senderAgentRunId', 'receiverAgentRunId', 'content',
    'messageType', 'createdAt', 'referenceFiles',
  ], 'TeamCommunicationMessageObject', label);
  return teamCommunicationMessageDtoSchema.parse({
    message_id: text(source.messageId, `${label}.messageId`),
    sender_agent_run_id: text(source.senderAgentRunId, `${label}.senderAgentRunId`),
    receiver_agent_run_id: text(source.receiverAgentRunId, `${label}.receiverAgentRunId`),
    content: text(source.content, `${label}.content`, true),
    message_type: text(source.messageType, `${label}.messageType`),
    reference_files: references(source.referenceFiles, `${label}.referenceFiles`),
    created_at: text(source.createdAt, `${label}.createdAt`),
  });
};

export const projectTeamCommunicationMessageDtos = (values: unknown): TeamCommunicationMessageDto[] => {
  if (!Array.isArray(values)) throw new Error('Team communication GraphQL response must be an array.');
  return values.map((value, index) => projectTeamCommunicationMessageDto(value, `Team communication message[${index}]`));
};
