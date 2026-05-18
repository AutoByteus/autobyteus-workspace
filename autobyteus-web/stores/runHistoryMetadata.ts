import { DEFAULT_AGENT_RUNTIME_KIND, type SkillAccessMode } from '~/types/agent/AgentRunConfig';
import type {
  TeamRunMetadataAgentMember,
  TeamRunMetadataMember,
  TeamRunMetadataPayload,
  TeamRunMetadataSubTeamMember,
} from '~/stores/runHistoryTypes';

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const normalizeRuntimeKind = (value: unknown) => {
  if (typeof value !== 'string') {
    return DEFAULT_AGENT_RUNTIME_KIND;
  }
  const normalized = value.trim();
  return (normalized.length > 0 ? normalized : DEFAULT_AGENT_RUNTIME_KIND) as TeamRunMetadataAgentMember['runtimeKind'];
};

const readString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const readNullableString = (value: unknown): string | null => {
  const normalized = readString(value);
  return normalized || null;
};

const normalizeSkillAccessMode = (value: unknown): SkillAccessMode | null => {
  if (value === 'PRELOADED_ONLY' || value === 'GLOBAL_DISCOVERY' || value === 'NONE') {
    return value;
  }
  return null;
};

const normalizePath = (value: unknown, fallbackRouteKey: string): string[] => {
  if (Array.isArray(value)) {
    const path = value
      .map((entry) => readString(entry))
      .filter(Boolean);
    if (path.length > 0) {
      return path;
    }
  }
  return fallbackRouteKey.split('/').map((segment) => segment.trim()).filter(Boolean);
};

const parseMemberMetadata = (value: unknown): TeamRunMetadataMember => {
  const member = asRecord(value);
  const memberKind = member.memberKind === 'agent_team' ? 'agent_team' : 'agent';
  const memberRouteKey = readString(member.memberRouteKey);
  const memberName = readString(member.memberName);
  const memberPath = normalizePath(member.memberPath, memberRouteKey);

  if (memberKind === 'agent_team') {
    return {
      memberKind,
      memberRouteKey,
      memberPath,
      memberName,
      memberRunId: readString(member.memberRunId),
      role: readNullableString(member.role),
      description: readNullableString(member.description),
      teamDefinitionId: readString(member.teamDefinitionId),
      teamRunId: readNullableString(member.teamRunId),
      coordinatorMemberRouteKey: readNullableString(member.coordinatorMemberRouteKey),
      memberTree: Array.isArray(member.memberTree)
        ? member.memberTree.map(parseMemberMetadata)
        : [],
    } satisfies TeamRunMetadataSubTeamMember;
  }

  return {
    memberKind,
    memberRouteKey,
    memberPath,
    memberName,
    memberRunId: readString(member.memberRunId),
    role: readNullableString(member.role),
    description: readNullableString(member.description),
    runtimeKind: normalizeRuntimeKind(member.runtimeKind),
    platformAgentRunId:
      typeof member.platformAgentRunId === 'string' ? member.platformAgentRunId : null,
    agentDefinitionId: readString(member.agentDefinitionId),
    llmModelIdentifier: readString(member.llmModelIdentifier),
    autoExecuteTools: Boolean(member.autoExecuteTools),
    skillAccessMode: normalizeSkillAccessMode(member.skillAccessMode),
    llmConfig:
      member.llmConfig && typeof member.llmConfig === 'object' && !Array.isArray(member.llmConfig)
        ? (member.llmConfig as Record<string, unknown>)
        : null,
    workspaceRootPath:
      typeof member.workspaceRootPath === 'string' ? member.workspaceRootPath : null,
  } satisfies TeamRunMetadataAgentMember;
};

export const flattenTeamRunAgentMetadata = (
  memberTree: readonly TeamRunMetadataMember[],
): TeamRunMetadataAgentMember[] => {
  const leaves: TeamRunMetadataAgentMember[] = [];
  const visit = (members: readonly TeamRunMetadataMember[]): void => {
    for (const member of members) {
      if (member.memberKind === 'agent') {
        leaves.push(member);
      } else {
        visit(member.memberTree);
      }
    }
  };
  visit(memberTree);
  return leaves;
};

export const parseTeamRunMetadata = (value: unknown): TeamRunMetadataPayload => {
  const payload = asRecord(value);
  if ('memberMetadata' in payload || 'runVersion' in payload) {
    throw new Error('unsupported legacy-metadata/topology-lost');
  }
  if (!Array.isArray(payload.memberTree)) {
    throw new Error('Invalid team run metadata: memberTree is required.');
  }

  return {
    teamRunId: String(payload.teamRunId ?? ''),
    teamDefinitionId: String(payload.teamDefinitionId || ''),
    teamDefinitionName: String(payload.teamDefinitionName || ''),
    coordinatorMemberRouteKey: String(payload.coordinatorMemberRouteKey || ''),
    createdAt: String(payload.createdAt || new Date().toISOString()),
    updatedAt: String(payload.updatedAt || new Date().toISOString()),
    archivedAt: typeof payload.archivedAt === 'string' ? payload.archivedAt : null,
    memberTree: payload.memberTree.map(parseMemberMetadata),
  };
};

export const toTeamMemberKey = (member: { memberRouteKey: string }): string =>
  member.memberRouteKey;
