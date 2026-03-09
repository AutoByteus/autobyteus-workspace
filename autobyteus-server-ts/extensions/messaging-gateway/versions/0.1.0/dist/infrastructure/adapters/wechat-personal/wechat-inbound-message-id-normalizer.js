import { createHash } from "node:crypto";
export function normalizeWechatInboundMessageId(event) {
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
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
//# sourceMappingURL=wechat-inbound-message-id-normalizer.js.map