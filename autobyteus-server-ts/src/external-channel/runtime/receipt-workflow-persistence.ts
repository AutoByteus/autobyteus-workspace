import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
  ChannelReceiptWorkflowState,
} from "../domain/models.js";
import { isNonTerminalReceiptWorkflowState } from "../domain/receipt-workflow-state.js";
import type { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import type { ReceiptWorkflowEvent } from "./receipt-workflow-reducer.js";
import { reduceReceiptWorkflow } from "./receipt-workflow-reducer.js";

export const ACTIVE_WORKFLOW_STATES: ChannelReceiptWorkflowState[] = [
  "TURN_BOUND",
  "COLLECTING_REPLY",
  "TURN_COMPLETED",
  "REPLY_FINALIZED",
  "PUBLISH_PENDING",
];

export const loadActiveReceipt = async (
  messageReceiptService: ChannelMessageReceiptService,
  key: ChannelIngressReceiptKey,
): Promise<ChannelMessageReceipt | null> => {
  const receipt = await messageReceiptService.getReceiptByExternalMessage(key);
  if (
    !receipt ||
    receipt.ingressState !== "ACCEPTED" ||
    !isNonTerminalReceiptWorkflowState(receipt.workflowState)
  ) {
    return null;
  }
  return receipt;
};

export const listActiveReceipts = async (
  messageReceiptService: ChannelMessageReceiptService,
): Promise<ChannelMessageReceipt[]> =>
  messageReceiptService.listReceiptsByWorkflowStates(ACTIVE_WORKFLOW_STATES);

export const persistReceiptWorkflowEvent = async (
  messageReceiptService: ChannelMessageReceiptService,
  receipt: ChannelMessageReceipt,
  event: ReceiptWorkflowEvent,
): Promise<ChannelMessageReceipt> => {
  if (event.type === "PUBLISH_SUCCEEDED") {
    if (!receipt.turnId || !receipt.agentRunId) {
      throw new Error(
        `Cannot mark published receipt '${receipt.externalMessageId}' without turnId and agentRunId.`,
      );
    }
    return messageReceiptService.markReplyPublished({
      provider: receipt.provider,
      transport: receipt.transport,
      accountId: receipt.accountId,
      peerId: receipt.peerId,
      threadId: receipt.threadId,
      externalMessageId: receipt.externalMessageId,
      receivedAt: receipt.receivedAt,
      agentRunId: receipt.agentRunId,
      teamRunId: receipt.teamRunId,
      turnId: receipt.turnId,
    });
  }

  if (event.type === "BINDING_MISSING") {
    return messageReceiptService.markIngressUnbound({
      provider: receipt.provider,
      transport: receipt.transport,
      accountId: receipt.accountId,
      peerId: receipt.peerId,
      threadId: receipt.threadId,
      externalMessageId: receipt.externalMessageId,
      receivedAt: receipt.receivedAt,
    });
  }

  const transition = reduceReceiptWorkflow(receipt, event);
  if (Object.keys(transition).length === 0) {
    return receipt;
  }
  return messageReceiptService.updateReceiptWorkflowProgress({
    provider: receipt.provider,
    transport: receipt.transport,
    accountId: receipt.accountId,
    peerId: receipt.peerId,
    threadId: receipt.threadId,
    externalMessageId: receipt.externalMessageId,
    receivedAt: receipt.receivedAt,
    workflowState: transition.workflowState ?? receipt.workflowState,
    turnId: transition.turnId,
    agentRunId: transition.agentRunId,
    teamRunId: transition.teamRunId,
    replyTextFinal: transition.replyTextFinal,
    lastError: transition.lastError,
  });
};
