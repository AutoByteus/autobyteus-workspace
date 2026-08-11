export type AgentTeamAddress = string;

export interface TeamExecutionAddress {
  readonly rootTeamRunId: string;
  readonly taskTeamRunIds: readonly string[];
  readonly memberAddress: AgentTeamAddress;
  readonly taskAgentRunId: string | null;
}

const rootedAddress = (value: string): AgentTeamAddress => {
  if (!value || value !== value.trim() || !value.startsWith('/') || value.startsWith('./')) {
    throw new Error(`Invalid AgentTeam address '${value}'.`);
  }
  if (value !== '/' && (value.endsWith('/') || value.includes('//') || value.includes('\\'))) {
    throw new Error(`Invalid AgentTeam address '${value}'.`);
  }
  const segments = value === '/' ? [] : value.slice(1).split('/');
  if (segments.some((segment) => !segment || segment !== segment.trim() || segment === '.' || segment === '..')) {
    throw new Error(`Invalid AgentTeam address '${value}'.`);
  }
  return value;
};

export const createTeamExecutionAddress = (input: {
  rootTeamRunId: string;
  taskTeamRunIds?: readonly string[] | null;
  memberAddress: string;
  taskAgentRunId?: string | null;
}): TeamExecutionAddress => {
  const allowed = new Set(['rootTeamRunId', 'taskTeamRunIds', 'memberAddress', 'taskAgentRunId']);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new Error('TeamExecutionAddress contains an unsupported identity field.');
  }
  const rootTeamRunId = input.rootTeamRunId.trim();
  if (!rootTeamRunId) throw new Error('rootTeamRunId is required.');
  const taskTeamRunIds = [...(input.taskTeamRunIds ?? [])].map((id) => id.trim());
  if (taskTeamRunIds.some((id) => !id)) throw new Error('taskTeamRunIds must not contain empty IDs.');
  const taskAgentRunId = input.taskAgentRunId === null || input.taskAgentRunId === undefined
    ? null
    : input.taskAgentRunId.trim();
  if (taskAgentRunId === '') throw new Error('taskAgentRunId must be non-empty or null.');
  return Object.freeze({
    rootTeamRunId,
    taskTeamRunIds: Object.freeze(taskTeamRunIds),
    memberAddress: rootedAddress(input.memberAddress),
    taskAgentRunId,
  });
};

export const parseTeamExecutionAddress = (value: unknown): TeamExecutionAddress => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('TeamExecutionAddress object required.');
  const record = value as Record<string, unknown>;
  const keys = ['rootTeamRunId', 'taskTeamRunIds', 'memberAddress', 'taskAgentRunId'];
  if (Object.keys(record).length !== keys.length || !keys.every((key) => Object.hasOwn(record, key))) {
    throw new Error('TeamExecutionAddress must contain exactly rootTeamRunId, taskTeamRunIds, memberAddress, and taskAgentRunId.');
  }
  if (typeof record.rootTeamRunId !== 'string' || !Array.isArray(record.taskTeamRunIds) ||
    !record.taskTeamRunIds.every((item) => typeof item === 'string') || typeof record.memberAddress !== 'string' ||
    (record.taskAgentRunId !== null && typeof record.taskAgentRunId !== 'string')) {
    throw new Error('Invalid TeamExecutionAddress field types.');
  }
  return createTeamExecutionAddress(record as unknown as TeamExecutionAddress);
};

export const parseSerializedTeamExecutionAddress = (value: string): TeamExecutionAddress => {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new Error('Serialized TeamExecutionAddress must be valid JSON.');
  }
  return parseTeamExecutionAddress(decoded);
};

export const serializeTeamExecutionAddress = (address: TeamExecutionAddress): string =>
  JSON.stringify(createTeamExecutionAddress(address));

export const sameTeamExecutionAddress = (left: TeamExecutionAddress, right: TeamExecutionAddress): boolean =>
  serializeTeamExecutionAddress(left) === serializeTeamExecutionAddress(right);

export const fromTeamExecutionAddressDto = (address: TeamExecutionAddressDto): TeamExecutionAddress =>
  createTeamExecutionAddress({
    rootTeamRunId: address.root_team_run_id,
    taskTeamRunIds: address.task_team_run_ids,
    memberAddress: address.member_address,
    taskAgentRunId: address.task_agent_run_id,
  });

export const toTeamExecutionAddressDto = (address: TeamExecutionAddress): TeamExecutionAddressDto => Object.freeze({
  root_team_run_id: address.rootTeamRunId,
  task_team_run_ids: [...address.taskTeamRunIds],
  member_address: address.memberAddress,
  task_agent_run_id: address.taskAgentRunId,
});

export const memberAddressBasename = (address: string): string =>
  address === '/' ? '/' : address.split('/').filter(Boolean).at(-1) ?? address;
import type { TeamExecutionAddressDto } from '@autobyteus/team-stream-contracts';
