import type { ApplicationExecutionContext } from '@autobyteus/application-sdk-contracts';
import {
  createTeamExecutionAddress,
  parseTeamExecutionAddress,
  sameTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const record = (value: unknown, subject: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(`${subject} must be an object.`);
  return value;
};

const exactKeys = (value: Record<string, unknown>, keys: readonly string[], subject: string): void => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${subject} contains unsupported or missing fields.`);
  }
};

const text = (value: unknown, subject: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${subject} is required.`);
  return value.trim();
};

export const parseApplicationExecutionContext = (
  value: unknown,
  expectedAddress: TeamExecutionAddress,
): ApplicationExecutionContext | null => {
  if (value === null || value === undefined) return null;
  const context = record(value, 'ApplicationExecutionContext');
  exactKeys(context, ['applicationId', 'bindingId', 'producer'], 'ApplicationExecutionContext');
  const producer = record(context.producer, 'ApplicationExecutionContext.producer');
  exactKeys(producer, ['executionAddress', 'displayName', 'runtimeKind'], 'ApplicationExecutionContext.producer');
  const executionAddress = parseTeamExecutionAddress(producer.executionAddress);
  if (!sameTeamExecutionAddress(executionAddress, expectedAddress)) {
    throw new Error('Application execution producer address does not match its concrete Team execution.');
  }
  if (producer.displayName !== null && typeof producer.displayName !== 'string') {
    throw new Error('Application execution producer displayName must be a string or null.');
  }
  const displayName = typeof producer.displayName === 'string'
    ? producer.displayName.trim() || null
    : null;
  if (producer.runtimeKind !== 'AGENT' && producer.runtimeKind !== 'AGENT_TEAM_MEMBER') {
    throw new Error('Application execution producer runtimeKind is invalid.');
  }
  return Object.freeze({
    applicationId: text(context.applicationId, 'ApplicationExecutionContext.applicationId'),
    bindingId: text(context.bindingId, 'ApplicationExecutionContext.bindingId'),
    producer: Object.freeze({
      executionAddress,
      displayName,
      runtimeKind: producer.runtimeKind,
    }),
  });
};

export const rebindApplicationExecutionContext = (
  context: ApplicationExecutionContext | null,
  executionAddress: TeamExecutionAddress,
): ApplicationExecutionContext | null => context ? Object.freeze({
  ...context,
  producer: Object.freeze({
    ...context.producer,
    executionAddress: createTeamExecutionAddress(executionAddress),
  }),
}) : null;
