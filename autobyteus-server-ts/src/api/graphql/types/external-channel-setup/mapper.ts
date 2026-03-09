import type {
  ChannelBinding,
  ChannelBindingLaunchPreset,
} from "../../../../external-channel/domain/models.js";
import type {
  ExternalChannelBindingGql,
  ExternalChannelLaunchPresetGql,
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
  launchPreset: toGraphqlLaunchPreset(binding.launchPreset),
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
