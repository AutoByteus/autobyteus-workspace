import { normalizeModelIdentifier, normalizeRuntimeKind } from '~/composables/useDefinitionLaunchDefaults';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { resolveEffectiveMemberLlmConfig, resolveEffectiveMemberRuntimeKind } from '~/utils/teamRunConfigUtils';

export interface TeamRunLeafMemberDefinition { displayName: string; address: string; agentDefinitionId: string }
export interface TeamRunMemberConfigRecord {
  displayName: string; memberAddress: string; agentDefinitionId: string; runtimeKind: string;
  llmModelIdentifier: string; llmConfig: Record<string, unknown> | null; autoExecuteTools: boolean;
  skillAccessMode: TeamRunConfig['skillAccessMode']; workspaceId?: string | null;
  workspaceMetadata?: WorkspaceMetadata | null; workspaceRootPath?: string | null;
}
export const buildTeamRunMemberConfigRecords = (params: {
  config: TeamRunConfig; leafMembers: TeamRunLeafMemberDefinition[]; workspaceRootPath?: string | null;
}): TeamRunMemberConfigRecord[] => params.leafMembers.map((member) => {
  const override = params.config.memberOverrides[member.address];
  const llmModelIdentifier = normalizeModelIdentifier(override?.llmModelIdentifier || params.config.llmModelIdentifier);
  if (!llmModelIdentifier) throw new Error(`A model is required for team member '${member.displayName}' before launching this team.`);
  return {
    displayName: member.displayName,
    memberAddress: member.address,
    agentDefinitionId: member.agentDefinitionId,
    runtimeKind: normalizeRuntimeKind(resolveEffectiveMemberRuntimeKind(override, params.config.runtimeKind)),
    llmModelIdentifier,
    llmConfig: resolveEffectiveMemberLlmConfig(override, params.config.llmConfig),
    autoExecuteTools: override?.autoExecuteTools ?? params.config.autoExecuteTools,
    skillAccessMode: params.config.skillAccessMode,
    workspaceId: params.config.workspaceId || undefined,
    workspaceMetadata: params.config.workspaceMetadata ?? null,
    workspaceRootPath: params.workspaceRootPath || params.config.workspaceMetadata?.workspaceRootPath || undefined,
  };
});
