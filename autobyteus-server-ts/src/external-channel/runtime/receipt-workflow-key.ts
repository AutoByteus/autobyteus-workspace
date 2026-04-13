import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
} from "../domain/models.js";

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
