import type { GetTeamCommunicationMessagesQuery } from '~/generated/graphql';
import type {
  TeamCommunicationMessage,
  TeamCommunicationReferenceFile,
  TeamCommunicationReferenceFileType,
} from '~/stores/teamCommunicationTypes';
import { parseTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

type TeamCommunicationMessageDto = GetTeamCommunicationMessagesQuery['getTeamCommunicationMessages'][number];

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

const requireGraphqlShape = (
  source: Record<string, unknown>,
  keys: readonly string[],
  typename: string,
  label: string,
): void => {
  if (hasExactKeys(source, keys)) return;
  if (hasExactKeys(source, ['__typename', ...keys]) && source.__typename === typename) return;
  throw new Error(`${label} has unsupported or missing GraphQL fields.`);
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

const ADDRESS_KEYS = ['rootTeamRunId', 'taskTeamRunIds', 'memberAddress', 'taskAgentRunId'] as const;
const REFERENCE_KEYS = ['referenceId', 'path', 'type', 'createdAt', 'updatedAt'] as const;
const MESSAGE_KEYS = [
  'messageId',
  'senderAddress',
  'receiverAddress',
  'content',
  'messageType',
  'createdAt',
  'referenceFiles',
] as const;
const REFERENCE_TYPES = new Set<TeamCommunicationReferenceFileType>([
  'file',
  'image',
  'audio',
  'video',
  'pdf',
  'csv',
  'excel',
  'other',
]);

const projectAddress = (value: unknown, label: string): TeamExecutionAddress => {
  const source = object(value, label);
  requireGraphqlShape(source, ADDRESS_KEYS, 'TeamExecutionAddressObject', label);
  return parseTeamExecutionAddress({
    rootTeamRunId: source.rootTeamRunId,
    taskTeamRunIds: source.taskTeamRunIds,
    memberAddress: source.memberAddress,
    taskAgentRunId: source.taskAgentRunId,
  });
};

const projectReference = (value: unknown, label: string): TeamCommunicationReferenceFile => {
  const source = object(value, label);
  requireGraphqlShape(source, REFERENCE_KEYS, 'TeamCommunicationReferenceFileObject', label);
  const type = text(source.type, `${label}.type`) as TeamCommunicationReferenceFileType;
  if (!REFERENCE_TYPES.has(type)) throw new Error(`${label}.type is unsupported.`);
  return {
    referenceId: text(source.referenceId, `${label}.referenceId`),
    path: text(source.path, `${label}.path`),
    type,
    createdAt: text(source.createdAt, `${label}.createdAt`),
    updatedAt: text(source.updatedAt, `${label}.updatedAt`),
  };
};

/** Projects one exact Apollo GraphQL DTO into the transport-free communication domain. */
export const projectTeamCommunicationMessageDto = (
  value: TeamCommunicationMessageDto,
  label = 'Team communication message',
): TeamCommunicationMessage => {
  const source = object(value, label);
  requireGraphqlShape(source, MESSAGE_KEYS, 'TeamCommunicationMessageObject', label);
  if (typeof source.content !== 'string') throw new Error(`${label}.content must be a string.`);
  if (!Array.isArray(source.referenceFiles)) throw new Error(`${label}.referenceFiles must be an array.`);
  return {
    messageId: text(source.messageId, `${label}.messageId`),
    senderAddress: projectAddress(source.senderAddress, `${label}.senderAddress`),
    receiverAddress: projectAddress(source.receiverAddress, `${label}.receiverAddress`),
    content: source.content,
    messageType: text(source.messageType, `${label}.messageType`),
    createdAt: text(source.createdAt, `${label}.createdAt`),
    referenceFiles: source.referenceFiles.map((entry, index) =>
      projectReference(entry, `${label}.referenceFiles[${index}]`)),
  };
};

/** One invalid GraphQL row rejects the complete root-scoped communication collection. */
export const projectTeamCommunicationMessageDtos = (
  values: GetTeamCommunicationMessagesQuery['getTeamCommunicationMessages'],
): TeamCommunicationMessage[] => {
  if (!Array.isArray(values)) throw new Error('Team communication GraphQL response must be an array.');
  return values.map((value, index) =>
    projectTeamCommunicationMessageDto(value, `Team communication message[${index}]`));
};
