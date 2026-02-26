import { describe, expect, it } from "vitest";
import {
  buildInboundIdempotencyKey,
  IdempotencyService,
} from "../../../../src/application/services/idempotency-service.js";
import { InMemoryIdempotencyStore } from "../../../../src/infrastructure/idempotency/in-memory-idempotency-store.js";

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

describe("IdempotencyService", () => {
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

  it("marks duplicate envelopes", async () => {
    const service = new IdempotencyService(new InMemoryIdempotencyStore(), {
      ttlSeconds: 60,
    });

    const first = await service.checkAndMarkEnvelope(buildEnvelope() as any);
    expect(first.duplicate).toBe(false);

    const second = await service.checkAndMarkEnvelope(buildEnvelope() as any);
    expect(second.duplicate).toBe(true);
  });

  it("does not collide keys across different peer/thread routes", async () => {
    const service = new IdempotencyService(new InMemoryIdempotencyStore(), {
      ttlSeconds: 60,
    });

    const first = await service.checkAndMarkEnvelope({
      ...buildEnvelope(),
      peerId: "peer-1",
      threadId: "thread-1",
      externalMessageId: "msg-same",
    } as any);
    const second = await service.checkAndMarkEnvelope({
      ...buildEnvelope(),
      peerId: "peer-2",
      threadId: "thread-2",
      externalMessageId: "msg-same",
    } as any);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
  });
});
