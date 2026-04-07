import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
} from "../domain/models.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import { logger } from "./channel-reply-bridge-support.js";
import {
  serializeReceiptKey,
  toReceiptKey,
} from "./accepted-receipt-key.js";
import type { AcceptedTurnCorrelation } from "./accepted-receipt-recovery-runtime-contract.js";

type PersistAcceptedReceiptCorrelationInput = {
  messageReceiptService: ChannelMessageReceiptService;
  scheduleProcessing: (key: ChannelIngressReceiptKey, delayMs: number) => void;
  retryDelayMs: number;
  receipt: ChannelMessageReceipt;
  correlation: AcceptedTurnCorrelation;
  failureLabel: string;
};

export const persistAcceptedReceiptCorrelation = async (
  input: PersistAcceptedReceiptCorrelationInput,
): Promise<void> => {
  try {
    const updatedReceipt =
      await input.messageReceiptService.updateAcceptedReceiptCorrelation({
        provider: input.receipt.provider,
        transport: input.receipt.transport,
        accountId: input.receipt.accountId,
        peerId: input.receipt.peerId,
        threadId: input.receipt.threadId,
        externalMessageId: input.receipt.externalMessageId,
        receivedAt: input.receipt.receivedAt,
        agentRunId: input.correlation.agentRunId,
        teamRunId: input.correlation.teamRunId,
        turnId: input.correlation.turnId,
      });
    input.scheduleProcessing(toReceiptKey(updatedReceipt), 0);
  } catch (error) {
    logger.warn(
      `Accepted receipt '${serializeReceiptKey(toReceiptKey(input.receipt))}' ${input.failureLabel}: ${String(error)}`,
    );
    input.scheduleProcessing(toReceiptKey(input.receipt), input.retryDelayMs);
  }
};
