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
  updateReceiptWorkflowProgress(
    input: ChannelReceiptWorkflowProgressInput,
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
  listReceiptsByWorkflowStates(
    states: ChannelReceiptWorkflowState[],
  ): Promise<ChannelMessageReceipt[]>;
  getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null>;
}
