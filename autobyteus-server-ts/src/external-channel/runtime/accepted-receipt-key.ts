import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
} from "../domain/models.js";

export type TurnCorrelationObserver = {
  unsubscribe: () => void;
  processing: Promise<void>;
};

export const toReceiptKey = (
  receipt: Pick<
    ChannelMessageReceipt,
    | "provider"
    | "transport"
    | "accountId"
    | "peerId"
    | "threadId"
    | "externalMessageId"
  >,
): ChannelIngressReceiptKey => ({
  provider: receipt.provider,
  transport: receipt.transport,
  accountId: receipt.accountId,
  peerId: receipt.peerId,
  threadId: receipt.threadId,
  externalMessageId: receipt.externalMessageId,
});

export const serializeReceiptKey = (key: ChannelIngressReceiptKey): string =>
  [
    key.provider,
    key.transport,
    key.accountId,
    key.peerId,
    key.threadId ?? "",
    key.externalMessageId,
  ].join("::");

export const compareAcceptedReceiptsOldestFirst = (
  left: ChannelMessageReceipt,
  right: ChannelMessageReceipt,
): number => {
  const createdAt = left.createdAt.getTime() - right.createdAt.getTime();
  if (createdAt !== 0) {
    return createdAt;
  }
  const receivedAt = left.receivedAt.getTime() - right.receivedAt.getTime();
  if (receivedAt !== 0) {
    return receivedAt;
  }
  return serializeReceiptKey(toReceiptKey(left)).localeCompare(
    serializeReceiptKey(toReceiptKey(right)),
  );
};
