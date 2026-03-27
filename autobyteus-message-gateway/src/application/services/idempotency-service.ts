import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";

export function buildInboundIdempotencyKey(envelope: ExternalMessageEnvelope): string {
  const threadPart =
    typeof envelope.threadId === "string" && envelope.threadId.trim().length > 0
      ? envelope.threadId.trim()
      : "_";
  return [
    envelope.provider,
    envelope.transport,
    envelope.accountId,
    envelope.peerId,
    threadPart,
    envelope.externalMessageId,
  ].join(":");
}
