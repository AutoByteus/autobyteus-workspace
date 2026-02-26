import { describe, expect, it, vi } from "vitest";
import { InboundMessageService } from "../../../../src/application/services/inbound-message-service.js";

const buildEnvelope = (externalMessageId: string) => ({
  provider: "WHATSAPP",
  transport: "BUSINESS_API",
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: "USER",
  threadId: "thread-1",
  externalMessageId,
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-08T00:00:00.000Z",
  metadata: {},
  routingKey: "WHATSAPP:BUSINESS_API:acct-1:peer-1:thread-1",
});

describe("InboundMessageService", () => {
  it("enqueues parsed inbound envelopes", async () => {
    const enqueue = vi.fn(async () => ({
      duplicate: false,
      record: { id: "inbox-1" },
    }));

    const adapter = {
      parseInbound: vi.fn(() => [buildEnvelope("msg-1")]),
    };

    const service = new InboundMessageService({
      adaptersByProvider: new Map([["WHATSAPP", adapter as any]]) as any,
      inboundInboxService: { enqueue } as any,
    });

    const result = await service.handleInbound("WHATSAPP" as any, {
      method: "POST",
      path: "/webhooks/whatsapp",
      headers: {},
      query: {},
      body: {},
      rawBody: "{}",
    });

    expect(result).toEqual({
      accepted: true,
      duplicate: false,
      blocked: false,
      forwarded: false,
      envelopeCount: 1,
    });
    expect(enqueue).toHaveBeenCalledOnce();
  });

  it("marks duplicate=true only when all parsed envelopes are duplicates", async () => {
    const enqueue = vi
      .fn()
      .mockResolvedValueOnce({
        duplicate: true,
        record: { id: "inbox-1" },
      })
      .mockResolvedValueOnce({
        duplicate: false,
        record: { id: "inbox-2" },
      });

    const adapter = {
      parseInbound: vi.fn(() => [buildEnvelope("msg-1"), buildEnvelope("msg-2")]),
    };

    const service = new InboundMessageService({
      adaptersByProvider: new Map([["WHATSAPP", adapter as any]]) as any,
      inboundInboxService: { enqueue } as any,
    });

    const result = await service.handleInbound("WHATSAPP" as any, {
      method: "POST",
      path: "/webhooks/whatsapp",
      headers: {},
      query: {},
      body: {},
      rawBody: "{}",
    });

    expect(result.duplicate).toBe(false);
    expect(enqueue).toHaveBeenCalledTimes(2);
  });

  it("returns DUPLICATE disposition for deduplicated normalized envelope", async () => {
    const service = new InboundMessageService({
      adaptersByProvider: new Map(),
      inboundInboxService: {
        enqueue: vi.fn(async () => ({
          duplicate: true,
          record: { id: "inbox-1" },
        })),
      } as any,
    });

    const result = await service.handleNormalizedEnvelope(buildEnvelope("msg-1") as any);
    expect(result).toEqual({
      duplicate: true,
      blocked: false,
      forwarded: false,
      disposition: "DUPLICATE",
      bindingResolved: false,
    });
  });
});
