import type {
  ChannelBinding,
  ChannelBindingTargetOption,
} from "../../../../external-channel/domain/models.js";
import type {
  ExternalChannelBindingGql,
  ExternalChannelBindingTargetOptionGql,
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
  targetRunId: getTargetRunId(binding),
  updatedAt: binding.updatedAt,
});

export const toGraphqlTargetOption = (
  option: ChannelBindingTargetOption,
): ExternalChannelBindingTargetOptionGql => ({
  targetType: option.targetType,
  targetRunId: option.targetRunId,
  displayName: option.displayName,
  status: option.status,
});

const getTargetRunId = (binding: ChannelBinding): string => {
  if (binding.targetType === "AGENT") {
    if (!binding.agentRunId) {
      throw new Error(`Binding ${binding.id} has targetType AGENT but agentRunId is null.`);
    }
    return binding.agentRunId;
  }

  if (!binding.teamRunId) {
    throw new Error(`Binding ${binding.id} has targetType TEAM but teamRunId is null.`);
  }
  return binding.teamRunId;
};
