import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import type { TeamRunMetadataPayload } from '~/stores/runHistoryTypes';

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
  return (normalized.length > 0 ? normalized : DEFAULT_AGENT_RUNTIME_KIND) as TeamRunMetadataPayload['memberMetadata'][number]['runtimeKind'];
};

export const parseTeamRunMetadata = (value: unknown): TeamRunMetadataPayload => {
  const payload = asRecord(value);
  const memberMetadata = Array.isArray(payload.memberMetadata)
    ? payload.memberMetadata.map((item) => {
        const member = asRecord(item);
        return {
          memberRouteKey: String(member.memberRouteKey || ''),
          memberName: String(member.memberName || ''),
          memberRunId: String(member.memberRunId ?? ''),
          runtimeKind: normalizeRuntimeKind(member.runtimeKind),
          platformAgentRunId:
            typeof member.platformAgentRunId === 'string' ? member.platformAgentRunId : null,
          agentDefinitionId: String(member.agentDefinitionId || ''),
          llmModelIdentifier: String(member.llmModelIdentifier || ''),
          autoExecuteTools: Boolean(member.autoExecuteTools),
          skillAccessMode:
            typeof member.skillAccessMode === 'string' ? member.skillAccessMode : null,
          llmConfig:
            member.llmConfig && typeof member.llmConfig === 'object' && !Array.isArray(member.llmConfig)
              ? (member.llmConfig as Record<string, unknown>)
              : null,
          workspaceRootPath:
            typeof member.workspaceRootPath === 'string' ? member.workspaceRootPath : null,
        };
      })
    : [];
  return {
    teamRunId: String(payload.teamRunId ?? ''),
    teamDefinitionId: String(payload.teamDefinitionId || ''),
    teamDefinitionName: String(payload.teamDefinitionName || ''),
    coordinatorMemberRouteKey: String(payload.coordinatorMemberRouteKey || ''),
    runVersion: Number(payload.runVersion || 1),
    createdAt: String(payload.createdAt || new Date().toISOString()),
    updatedAt: String(payload.updatedAt || new Date().toISOString()),
    memberMetadata,
  };
};

export const toTeamMemberKey = (member: { memberRouteKey: string; memberName: string }): string =>
  member.memberRouteKey || member.memberName;
