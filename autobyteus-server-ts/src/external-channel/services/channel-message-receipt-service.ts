import type {
  ChannelDispatchTarget,
  ChannelIngressReceiptInput,
  ChannelSourceContext,
  ChannelTurnReceiptBindingInput,
} from "../domain/models.js";
import type { ChannelMessageReceiptProvider } from "../providers/channel-message-receipt-provider.js";
import { getProviderProxySet } from "../providers/provider-proxy-set.js";

export class ChannelMessageReceiptService {
  constructor(
    private readonly provider: ChannelMessageReceiptProvider = getProviderProxySet().messageReceiptProvider,
  ) {}

  async recordIngressReceipt(input: ChannelIngressReceiptInput): Promise<void> {
    const normalized = this.normalizeReceiptInput(input);
    await this.provider.recordIngressReceipt(normalized);
  }

  async bindTurnToReceipt(input: ChannelTurnReceiptBindingInput): Promise<void> {
    const normalized = this.normalizeTurnBindingInput(input);
    await this.provider.bindTurnToReceipt(normalized);
  }

  async getLatestSourceByAgentRunId(
    agentRunId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    return this.provider.getLatestSourceByAgentRunId(normalizedAgentRunId);
  }

  async getLatestSourceByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelSourceContext | null> {
    const agentRunId = normalizeNullableString(target.agentRunId, "agentRunId");
    const teamRunId = normalizeNullableString(target.teamRunId, "teamRunId");
    if (!agentRunId && !teamRunId) {
      throw new Error(
        "Dispatch target lookup requires at least one of agentRunId or teamRunId.",
      );
    }

    return this.provider.getLatestSourceByDispatchTarget({
      agentRunId,
      teamRunId,
    });
  }

  async getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const normalizedTurnId = normalizeRequiredString(turnId, "turnId");
    return this.provider.getSourceByAgentRunTurn(normalizedAgentRunId, normalizedTurnId);
  }

  private normalizeReceiptInput(
    input: ChannelIngressReceiptInput,
  ): ChannelIngressReceiptInput {
    const agentRunId = normalizeNullableString(input.agentRunId, "agentRunId");
    const teamRunId = normalizeNullableString(input.teamRunId, "teamRunId");
    if (!agentRunId && !teamRunId) {
      throw new Error(
        "Ingress receipt requires at least one target reference (agentRunId or teamRunId).",
      );
    }

    const receivedAt = normalizeDate(input.receivedAt, "receivedAt");

    return {
      ...input,
      accountId: normalizeRequiredString(input.accountId, "accountId"),
      peerId: normalizeRequiredString(input.peerId, "peerId"),
      threadId: normalizeNullableString(input.threadId, "threadId"),
      externalMessageId: normalizeRequiredString(
        input.externalMessageId,
        "externalMessageId",
      ),
      agentRunId,
      teamRunId,
      receivedAt,
    };
  }

  private normalizeTurnBindingInput(
    input: ChannelTurnReceiptBindingInput,
  ): ChannelTurnReceiptBindingInput {
    const agentRunId = normalizeNullableString(input.agentRunId, "agentRunId");
    const teamRunId = normalizeNullableString(input.teamRunId, "teamRunId");
    if (!agentRunId && !teamRunId) {
      throw new Error(
        "Turn receipt binding requires at least one target reference (agentRunId or teamRunId).",
      );
    }

    return {
      ...input,
      accountId: normalizeRequiredString(input.accountId, "accountId"),
      peerId: normalizeRequiredString(input.peerId, "peerId"),
      threadId: normalizeNullableString(input.threadId, "threadId"),
      externalMessageId: normalizeRequiredString(
        input.externalMessageId,
        "externalMessageId",
      ),
      turnId: normalizeRequiredString(input.turnId, "turnId"),
      receivedAt: normalizeDate(input.receivedAt, "receivedAt"),
      agentRunId,
      teamRunId,
    };
  }
}

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (
  value: string | null,
  field: string,
): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }
  return normalized;
};

const normalizeDate = (value: Date, field: string): Date => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${field} must be a valid Date.`);
  }
  return value;
};
