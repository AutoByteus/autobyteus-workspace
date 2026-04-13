import type {
  ChannelAcceptedIngressReceiptInput,
  ChannelClaimIngressDispatchInput,
  ChannelDispatchTarget,
  ChannelIngressReceiptKey,
  ChannelIngressReceiptState,
  ChannelMessageReceipt,
  ChannelPendingIngressReceiptInput,
  ChannelReplyPublishedReceiptInput,
  ChannelReceiptWorkflowProgressInput,
  ChannelReceiptWorkflowState,
  ChannelSourceContext,
  ChannelUnboundIngressReceiptInput,
} from "../domain/models.js";
import type { ChannelMessageReceiptProvider } from "../providers/channel-message-receipt-provider.js";
import { getProviderProxySet } from "../providers/provider-proxy-set.js";

export class ChannelMessageReceiptService {
  constructor(
    private readonly provider: ChannelMessageReceiptProvider = getProviderProxySet().messageReceiptProvider,
  ) {}

  async getReceiptByExternalMessage(
    input: ChannelIngressReceiptKey,
  ): Promise<ChannelMessageReceipt | null> {
    const normalized = this.normalizeReceiptKey(input);
    return this.provider.getReceiptByExternalMessage(normalized);
  }

  async createPendingIngressReceipt(
    input: ChannelPendingIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const normalized = this.normalizePendingReceiptInput(input);
    return this.provider.createPendingIngressReceipt(normalized);
  }

  async claimIngressDispatch(
    input: ChannelClaimIngressDispatchInput,
  ): Promise<ChannelMessageReceipt> {
    const normalized = this.normalizeClaimDispatchInput(input);
    return this.provider.claimIngressDispatch(normalized);
  }

  async recordAcceptedDispatch(
    input: ChannelAcceptedIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const normalized = this.normalizeAcceptedReceiptInput(input);
    return this.provider.recordAcceptedDispatch(normalized);
  }

  async markIngressUnbound(
    input: ChannelUnboundIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const normalized = this.normalizePendingReceiptInput(input);
    return this.provider.markIngressUnbound(normalized);
  }

  async updateReceiptWorkflowProgress(
    input: ChannelReceiptWorkflowProgressInput,
  ): Promise<ChannelMessageReceipt> {
    const normalized = this.normalizeWorkflowProgressInput(input);
    return this.provider.updateReceiptWorkflowProgress(normalized);
  }

  async markReplyPublished(
    input: ChannelReplyPublishedReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const normalized = this.normalizeReplyPublishedReceiptInput(input);
    return this.provider.markReplyPublished(normalized);
  }

  async listReceiptsByIngressState(
    state: ChannelIngressReceiptState,
  ): Promise<ChannelMessageReceipt[]> {
    return this.provider.listReceiptsByIngressState(state);
  }

  async listReceiptsByWorkflowStates(
    states: ChannelReceiptWorkflowState[],
  ): Promise<ChannelMessageReceipt[]> {
    return this.provider.listReceiptsByWorkflowStates(states);
  }

  async getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const normalizedTurnId = normalizeRequiredString(turnId, "turnId");
    return this.provider.getSourceByAgentRunTurn(normalizedAgentRunId, normalizedTurnId);
  }

  isDispatchLeaseExpired(
    receipt: Pick<ChannelMessageReceipt, "dispatchLeaseExpiresAt">,
    now: Date = new Date(),
  ): boolean {
    const normalizedNow = normalizeDate(now, "now");
    const leaseExpiresAt = receipt.dispatchLeaseExpiresAt;
    if (!leaseExpiresAt) {
      return true;
    }
    return leaseExpiresAt.getTime() <= normalizedNow.getTime();
  }

  private normalizeReceiptKey(
    input: ChannelIngressReceiptKey,
  ): ChannelIngressReceiptKey {
    return {
      ...input,
      accountId: normalizeRequiredString(input.accountId, "accountId"),
      peerId: normalizeRequiredString(input.peerId, "peerId"),
      threadId: normalizeNullableString(input.threadId, "threadId"),
      externalMessageId: normalizeRequiredString(
        input.externalMessageId,
        "externalMessageId",
      ),
    };
  }

  private normalizePendingReceiptInput(
    input: ChannelPendingIngressReceiptInput,
  ): ChannelPendingIngressReceiptInput {
    return {
      ...this.normalizeReceiptKey(input),
      receivedAt: normalizeDate(input.receivedAt, "receivedAt"),
    };
  }

  private normalizeClaimDispatchInput(
    input: ChannelClaimIngressDispatchInput,
  ): ChannelClaimIngressDispatchInput {
    const leaseDurationMs = normalizePositiveInteger(
      input.leaseDurationMs,
      "leaseDurationMs",
    );
    return {
      ...this.normalizePendingReceiptInput(input),
      claimedAt: normalizeDate(input.claimedAt, "claimedAt"),
      leaseDurationMs,
    };
  }

  private normalizeAcceptedReceiptInput(
    input: ChannelAcceptedIngressReceiptInput,
  ): ChannelAcceptedIngressReceiptInput {
    const agentRunId = normalizeNullableString(input.agentRunId, "agentRunId");
    const teamRunId = normalizeNullableString(input.teamRunId, "teamRunId");
    if (!agentRunId && !teamRunId) {
      throw new Error(
        "Accepted ingress receipt requires at least one target reference (agentRunId or teamRunId).",
      );
    }

    return {
      ...this.normalizePendingReceiptInput(input),
      agentRunId,
      teamRunId,
      turnId: normalizeRequiredString(input.turnId, "turnId"),
      dispatchAcceptedAt: normalizeDate(
        input.dispatchAcceptedAt,
        "dispatchAcceptedAt",
      ),
      dispatchLeaseToken: normalizeRequiredString(
        input.dispatchLeaseToken,
        "dispatchLeaseToken",
      ),
    };
  }

  private normalizeReplyPublishedReceiptInput(
    input: ChannelReplyPublishedReceiptInput,
  ): ChannelReplyPublishedReceiptInput {
    const normalized = {
      ...this.normalizeReceiptKey(input),
      receivedAt: normalizeDate(input.receivedAt, "receivedAt"),
      turnId: normalizeRequiredString(input.turnId, "turnId"),
      ...this.normalizeDispatchTarget(input),
    };
    return {
      ...normalized,
      turnId: normalized.turnId,
    };
  }

  private normalizeWorkflowProgressInput(
    input: ChannelReceiptWorkflowProgressInput,
  ): ChannelReceiptWorkflowProgressInput {
    const normalizedKey = this.normalizeReceiptKey(input);
    return {
      ...normalizedKey,
      workflowState: input.workflowState,
      receivedAt: normalizeDate(input.receivedAt, "receivedAt"),
      turnId:
        input.turnId === undefined
          ? undefined
          : normalizeNullableString(input.turnId ?? null, "turnId"),
      agentRunId:
        input.agentRunId === undefined
          ? undefined
          : normalizeNullableString(input.agentRunId ?? null, "agentRunId"),
      teamRunId:
        input.teamRunId === undefined
          ? undefined
          : normalizeNullableString(input.teamRunId ?? null, "teamRunId"),
      replyTextFinal:
        input.replyTextFinal === undefined
          ? undefined
          : normalizeNullableString(input.replyTextFinal ?? null, "replyTextFinal"),
      lastError:
        input.lastError === undefined
          ? undefined
          : normalizeNullableString(input.lastError ?? null, "lastError"),
    };
  }

  private normalizeDispatchTarget(
    input: ChannelDispatchTarget,
  ): ChannelDispatchTarget {
    const agentRunId = normalizeNullableString(input.agentRunId, "agentRunId");
    const teamRunId = normalizeNullableString(input.teamRunId, "teamRunId");
    if (!agentRunId && !teamRunId) {
      throw new Error(
        "Dispatch target requires at least one target reference (agentRunId or teamRunId).",
      );
    }
    return {
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

const normalizePositiveInteger = (value: number, field: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return value;
};
