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
  return (normalized.length > 0 ? normalized : DEFAULT_AGENT_RUNTIME_KIND) as TeamRunMetadataPayload['memberBindings'][number]['runtimeKind'];
};

export const parseTeamRunMetadata = (value: unknown): TeamRunMetadataPayload => {
  const payload = asRecord(value);
  const memberBindings = Array.isArray(payload.memberBindings)
    ? payload.memberBindings.map((item) => {
        const binding = asRecord(item);
        return {
          memberRouteKey: String(binding.memberRouteKey || ''),
          memberName: String(binding.memberName || ''),
          memberRunId: String(binding.memberRunId ?? ''),
          runtimeKind: normalizeRuntimeKind(binding.runtimeKind),
          runtimeReference:
            binding.runtimeReference &&
            typeof binding.runtimeReference === 'object' &&
            !Array.isArray(binding.runtimeReference)
              ? {
                  runtimeKind: normalizeRuntimeKind(
                    (binding.runtimeReference as Record<string, unknown>).runtimeKind,
                  ),
                  sessionId:
                    typeof (binding.runtimeReference as Record<string, unknown>).sessionId ===
                    'string'
                      ? ((binding.runtimeReference as Record<string, unknown>).sessionId as string)
                      : null,
                  threadId:
                    typeof (binding.runtimeReference as Record<string, unknown>).threadId ===
                    'string'
                      ? ((binding.runtimeReference as Record<string, unknown>).threadId as string)
                      : null,
                  metadata:
                    (binding.runtimeReference as Record<string, unknown>).metadata &&
                    typeof (binding.runtimeReference as Record<string, unknown>).metadata ===
                      'object' &&
                    !Array.isArray((binding.runtimeReference as Record<string, unknown>).metadata)
                      ? ((binding.runtimeReference as Record<string, unknown>).metadata as Record<
                          string,
                          unknown
                        >)
                      : null,
                }
              : null,
          agentDefinitionId: String(binding.agentDefinitionId || ''),
          llmModelIdentifier: String(binding.llmModelIdentifier || ''),
          autoExecuteTools: Boolean(binding.autoExecuteTools),
          llmConfig:
            binding.llmConfig && typeof binding.llmConfig === 'object' && !Array.isArray(binding.llmConfig)
              ? (binding.llmConfig as Record<string, unknown>)
              : null,
          workspaceRootPath:
            typeof binding.workspaceRootPath === 'string' ? binding.workspaceRootPath : null,
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
    memberBindings,
  };
};

export const toTeamMemberKey = (member: { memberRouteKey: string; memberName: string }): string =>
  member.memberRouteKey || member.memberName;
