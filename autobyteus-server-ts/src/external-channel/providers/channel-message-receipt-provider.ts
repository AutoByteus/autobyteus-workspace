import type {
  ChannelAcceptedIngressReceiptInput,
  ChannelAcceptedReceiptCorrelationInput,
  ChannelClaimIngressDispatchInput,
  ChannelIngressReceiptKey,
  ChannelIngressReceiptState,
  ChannelMessageReceipt,
  ChannelPendingIngressReceiptInput,
  ChannelReplyPublishedReceiptInput,
  ChannelSourceContext,
  ChannelUnboundIngressReceiptInput,
} from "../domain/models.js";

export interface ChannelMessageReceiptProvider {
  getReceiptByExternalMessage(
    input: ChannelIngressReceiptKey,
  ): Promise<ChannelMessageReceipt | null>;
  createPendingIngressReceipt(
    input: ChannelPendingIngressReceiptInput,
  ): Promise<ChannelMessageReceipt>;
  claimIngressDispatch(
    input: ChannelClaimIngressDispatchInput,
  ): Promise<ChannelMessageReceipt>;
  recordAcceptedDispatch(
    input: ChannelAcceptedIngressReceiptInput,
  ): Promise<ChannelMessageReceipt>;
  updateAcceptedReceiptCorrelation(
    input: ChannelAcceptedReceiptCorrelationInput,
  ): Promise<ChannelMessageReceipt>;
  markReplyPublished(
    input: ChannelReplyPublishedReceiptInput,
  ): Promise<ChannelMessageReceipt>;
  markIngressUnbound(
    input: ChannelUnboundIngressReceiptInput,
  ): Promise<ChannelMessageReceipt>;
  listReceiptsByIngressState(
    state: ChannelIngressReceiptState,
  ): Promise<ChannelMessageReceipt[]>;
  getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null>;
}
