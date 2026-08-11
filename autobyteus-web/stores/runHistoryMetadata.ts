import type { SkillAccessMode } from '~/types/agent/AgentRunConfig';
import { parseApplicationExecutionContext } from '~/services/teamExecution/applicationExecutionContextMapper';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type {
  TeamRunMetadataAgentMember,
  TeamRunMetadataMember,
  TeamRunMetadataPayload,
  TeamRunMetadataSubTeamMember,
} from '~/stores/runHistoryTypes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const record = (value: unknown, subject: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error(`Invalid ${subject}: object required.`);
  }
  return value;
};

const exactKeys = (value: Record<string, unknown>, expected: readonly string[], subject: string): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`Invalid ${subject}: unsupported or missing field(s).`);
  }
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid TeamRun metadata: ${field} is required.`);
  return value.trim();
};

const nullableString = (value: unknown, field: string): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`Invalid TeamRun metadata: ${field} must be a string or null.`);
  return value.trim() || null;
};

const canonicalAddress = (value: unknown, field: string): string => {
  const address = requiredString(value, field);
  if (!address.startsWith('/') || address.startsWith('./') || address.includes('//') || address.includes('\\') || (address !== '/' && address.endsWith('/'))) {
    throw new Error(`Invalid TeamRun metadata: ${field} is not a canonical AgentTeam address.`);
  }
  if (address !== '/' && address.slice(1).split('/').some((segment) =>
    !segment || segment !== segment.trim() || segment === '.' || segment === '..')) {
    throw new Error(`Invalid TeamRun metadata: ${field} is not a canonical AgentTeam address.`);
  }
  return address;
};

const parseMemberMetadata = (
  value: unknown,
  isRoot = false,
  rootTeamRunId: string | null = null,
): TeamRunMetadataMember => {
  const member = record(value, 'TeamRun member');
  const address = canonicalAddress(member.address, 'member.address');
  if (isRoot && address !== '/') throw new Error("Invalid TeamRun metadata: rootTeam must use address '/'.");
  const common = {
    address,
    role: nullableString(member.role, `${address}.role`),
    description: nullableString(member.description, `${address}.description`),
  };
  if (member.kind === 'agent_team') {
    exactKeys(member, isRoot
      ? ['kind', 'address', 'teamDefinitionId', 'teamRunId', 'coordinatorAddress', 'children']
      : ['kind', 'address', 'teamDefinitionId', 'teamRunId', 'coordinatorAddress', 'role', 'description', 'children'],
    'TeamRun AgentTeam member');
    if (!Array.isArray(member.children)) throw new Error(`Invalid TeamRun metadata: ${address}.children must be an array.`);
    const teamRunId = requiredString(member.teamRunId, `${address}.teamRunId`);
    const aggregateRootTeamRunId = isRoot ? teamRunId : rootTeamRunId;
    if (!aggregateRootTeamRunId) throw new Error(`Invalid TeamRun metadata: ${address} has no rooted TeamRun identity.`);
    return {
      kind: 'agent_team',
      ...common,
      teamDefinitionId: requiredString(member.teamDefinitionId, `${address}.teamDefinitionId`),
      teamRunId,
      coordinatorAddress: canonicalAddress(member.coordinatorAddress, `${address}.coordinatorAddress`),
      children: member.children.map((child) => parseMemberMetadata(child, false, aggregateRootTeamRunId)),
    } satisfies TeamRunMetadataSubTeamMember;
  }
  if (member.kind !== 'agent') throw new Error(`Invalid TeamRun metadata: unsupported member kind at '${address}'.`);
  if (isRoot) throw new Error("Invalid TeamRun metadata: rootTeam must be an AgentTeam.");
  if (!rootTeamRunId) throw new Error(`Invalid TeamRun metadata: ${address} has no rooted TeamRun identity.`);
  exactKeys(member, [
    'kind', 'address', 'agentDefinitionId', 'agentRunId', 'platformAgentRunId',
    'role', 'description', 'runtimeKind', 'llmModelIdentifier', 'llmConfig',
    'autoExecuteTools', 'skillAccessMode', 'workspaceRootPath', 'applicationExecutionContext',
  ], 'TeamRun Agent member');
  if (typeof member.autoExecuteTools !== 'boolean') throw new Error(`Invalid TeamRun metadata: ${address}.autoExecuteTools must be boolean.`);
  const skillAccessMode = requiredString(member.skillAccessMode, `${address}.skillAccessMode`) as SkillAccessMode;
  return {
    kind: 'agent',
    ...common,
    agentRunId: requiredString(member.agentRunId, `${address}.agentRunId`),
    platformAgentRunId: nullableString(member.platformAgentRunId, `${address}.platformAgentRunId`),
    runtimeKind: requiredString(member.runtimeKind, `${address}.runtimeKind`) as TeamRunMetadataAgentMember['runtimeKind'],
    agentDefinitionId: requiredString(member.agentDefinitionId, `${address}.agentDefinitionId`),
    llmModelIdentifier: requiredString(member.llmModelIdentifier, `${address}.llmModelIdentifier`),
    autoExecuteTools: member.autoExecuteTools,
    skillAccessMode,
    llmConfig: member.llmConfig && typeof member.llmConfig === 'object' && !Array.isArray(member.llmConfig)
      ? member.llmConfig as Record<string, unknown>
      : null,
    workspaceRootPath: nullableString(member.workspaceRootPath, `${address}.workspaceRootPath`),
    applicationExecutionContext: parseApplicationExecutionContext(
      member.applicationExecutionContext,
      createTeamExecutionAddress({ rootTeamRunId, memberAddress: address }),
    ),
  } satisfies TeamRunMetadataAgentMember;
};

export const flattenTeamRunAgentMetadata = (
  members: readonly TeamRunMetadataMember[],
): TeamRunMetadataAgentMember[] => members.flatMap((member) =>
  member.kind === 'agent' ? [member] : flattenTeamRunAgentMetadata(member.children));

export const parseTeamRunMetadata = (value: unknown): TeamRunMetadataPayload => {
  const payload = record(value, 'TeamRun metadata');
  if (payload.schemaVersion !== 3) throw new Error('unsupported legacy TeamRun metadata: schemaVersion 3 is required.');
  exactKeys(payload, ['schemaVersion', 'teamDefinitionName', 'createdAt', 'archivedAt', 'rootTeam', 'handoffs'], 'TeamRun metadata');
  const parsedRoot = parseMemberMetadata(payload.rootTeam, true);
  if (parsedRoot.kind !== 'agent_team' || parsedRoot.address !== '/') throw new Error("Invalid TeamRun metadata: rootTeam must be the AgentTeam at '/'.");
  if (!Array.isArray(payload.handoffs)) throw new Error('Invalid TeamRun metadata: handoffs must be an array.');
  return {
    schemaVersion: 3,
    teamDefinitionName: requiredString(payload.teamDefinitionName, 'teamDefinitionName'),
    createdAt: requiredString(payload.createdAt, 'createdAt'),
    archivedAt: nullableString(payload.archivedAt, 'archivedAt'),
    rootTeam: parsedRoot,
    handoffs: payload.handoffs.map((value, index) => {
      const handoff = record(value, `handoff ${index}`);
      exactKeys(handoff, ['from', 'to', 'rules'], `handoff ${index}`);
      if (!Array.isArray(handoff.rules) || handoff.rules.length === 0) {
        throw new Error(`Invalid TeamRun metadata: handoffs[${index}].rules must be a non-empty array.`);
      }
      return {
        from: canonicalAddress(handoff.from, `handoffs[${index}].from`),
        to: canonicalAddress(handoff.to, `handoffs[${index}].to`),
        rules: handoff.rules.map((rule, ruleIndex) => requiredString(rule, `handoffs[${index}].rules[${ruleIndex}]`)),
      };
    }),
  };
};

export const toTeamMemberKey = (member: { address: string }): string => member.address;
