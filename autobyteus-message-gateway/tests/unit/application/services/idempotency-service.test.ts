import { describe, expect, it } from "vitest";
import { buildInboundIdempotencyKey } from "../../../../src/application/services/idempotency-service.js";

const buildEnvelope = () => ({
  provider: "WHATSAPP",
  transport: "BUSINESS_API",
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: "USER",
  threadId: "thread-1",
  externalMessageId: "msg-1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-08T00:00:00.000Z",
  metadata: {},
  routingKey: "WHATSAPP:BUSINESS_API:acct-1:peer-1:thread-1",
});

describe("buildInboundIdempotencyKey", () => {
  it("builds deterministic inbound idempotency keys", () => {
    const key = buildInboundIdempotencyKey(buildEnvelope() as any);
    expect(key).toBe("WHATSAPP:BUSINESS_API:acct-1:peer-1:thread-1:msg-1");
  });

  it("uses a stable placeholder when threadId is missing", () => {
    const key = buildInboundIdempotencyKey({
      ...buildEnvelope(),
      threadId: null,
    } as any);
    expect(key).toBe("WHATSAPP:BUSINESS_API:acct-1:peer-1:_:msg-1");
  });
});
