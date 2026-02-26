import { createHash } from "node:crypto";
import type { WechatyInboundEvent } from "./wechaty-sidecar-client.js";

export function normalizeWechatInboundMessageId(
  event: WechatyInboundEvent,
): string {
  const candidate = normalizeOptionalString(event.messageId);
  if (candidate) {
    return candidate;
  }

  const hashBase = [
    event.sessionId,
    event.peerId,
    event.threadId ?? "",
    event.content,
    event.receivedAt,
  ].join("|");
  const digest = createHash("sha1").update(hashBase).digest("hex");
  return `wechat-hash-${digest.slice(0, 24)}`;
}

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
