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
  targetId: getTargetId(binding),
  updatedAt: binding.updatedAt,
});

export const toGraphqlTargetOption = (
  option: ChannelBindingTargetOption,
): ExternalChannelBindingTargetOptionGql => ({
  targetType: option.targetType,
  targetId: option.targetId,
  displayName: option.displayName,
  status: option.status,
});

const getTargetId = (binding: ChannelBinding): string => {
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
