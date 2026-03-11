import type {
  ChannelBinding,
  ChannelBindingLaunchPreset,
  ChannelBindingTeamLaunchPreset,
} from "../../../../external-channel/domain/models.js";
import type {
  ExternalChannelBindingGql,
  ExternalChannelLaunchPresetGql,
  ExternalChannelTeamLaunchPresetGql,
} from "./types.js";

export const toGraphqlBinding = (
  binding: ChannelBinding,
): ExternalChannelBindingGql => ({
  id: binding.id,
  provider: binding.provider,
  transport: binding.transport,
  accountId: binding.accountId,
  peerId: binding.peerId,
  threadId: binding.threadId,
  targetType: binding.targetType,
  targetAgentDefinitionId: binding.agentDefinitionId,
  targetTeamDefinitionId: binding.teamDefinitionId,
  launchPreset: toGraphqlLaunchPreset(binding.launchPreset),
  teamLaunchPreset: toGraphqlTeamLaunchPreset(binding.teamLaunchPreset),
  teamRunId: binding.teamRunId,
  updatedAt: binding.updatedAt,
});

const toGraphqlLaunchPreset = (
  preset: ChannelBindingLaunchPreset | null,
): ExternalChannelLaunchPresetGql | null => {
  if (!preset) {
    return null;
  }

  return {
    workspaceRootPath: preset.workspaceRootPath,
    llmModelIdentifier: preset.llmModelIdentifier,
    runtimeKind: preset.runtimeKind,
    autoExecuteTools: preset.autoExecuteTools,
    skillAccessMode: preset.skillAccessMode,
    llmConfig: preset.llmConfig,
  };
};

const toGraphqlTeamLaunchPreset = (
  preset: ChannelBindingTeamLaunchPreset | null,
): ExternalChannelTeamLaunchPresetGql | null => {
  if (!preset) {
    return null;
  }

  return {
    workspaceRootPath: preset.workspaceRootPath,
    llmModelIdentifier: preset.llmModelIdentifier,
    runtimeKind: preset.runtimeKind,
    autoExecuteTools: preset.autoExecuteTools,
    llmConfig: preset.llmConfig,
  };
};
