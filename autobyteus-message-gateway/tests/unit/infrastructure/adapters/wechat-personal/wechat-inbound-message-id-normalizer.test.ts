import { describe, expect, it } from "vitest";
import { normalizeWechatInboundMessageId } from "../../../../../src/infrastructure/adapters/wechat-personal/wechat-inbound-message-id-normalizer.js";

describe("normalizeWechatInboundMessageId", () => {
  it("uses explicit sidecar message id when available", () => {
    const result = normalizeWechatInboundMessageId({
      sessionId: "session-1",
      accountLabel: "Home",
      peerId: "peer-1",
      peerType: "USER",
      threadId: null,
      messageId: " msg-1 ",
      content: "hello",
      receivedAt: "2026-02-09T10:00:00.000Z",
    });

    expect(result).toBe("msg-1");
  });

  it("builds deterministic hash id without explicit message id", () => {
    const left = normalizeWechatInboundMessageId({
      sessionId: "session-1",
      accountLabel: "Home",
      peerId: "peer-1",
      peerType: "USER",
      threadId: null,
      content: "hello",
      receivedAt: "2026-02-09T10:00:00.000Z",
    });
    const right = normalizeWechatInboundMessageId({
      sessionId: "session-1",
      accountLabel: "Home",
      peerId: "peer-1",
      peerType: "USER",
      threadId: null,
      content: "hello",
      receivedAt: "2026-02-09T10:00:00.000Z",
    });

    expect(left).toMatch(/^wechat-hash-/);
    expect(left).toBe(right);
  });
});
