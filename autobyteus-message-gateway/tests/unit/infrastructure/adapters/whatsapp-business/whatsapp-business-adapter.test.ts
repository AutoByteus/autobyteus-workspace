import { describe, expect, it, vi } from "vitest";
import { WhatsAppBusinessAdapter } from "../../../../../src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.js";

describe("WhatsAppBusinessAdapter", () => {
  it("verifies valid signature when app secret is set", () => {
    const adapter = new WhatsAppBusinessAdapter({ appSecret: "secret-1" });
    const rawBody = JSON.stringify({ hello: "world" });
    const signature = adapter.createSignature(rawBody);

    const result = adapter.verifyInboundSignature(
      {
        method: "POST",
        path: "/webhooks/whatsapp",
        headers: { "x-whatsapp-signature": signature },
        query: {},
        body: {},
        rawBody,
      },
      rawBody,
    );

    expect(result.valid).toBe(true);
  });

  it("parses WhatsApp events into canonical external envelopes", () => {
    const adapter = new WhatsAppBusinessAdapter({ appSecret: null });

    const envelopes = adapter.parseInbound({
      method: "POST",
      path: "/webhooks/whatsapp",
      headers: {},
      query: {},
      rawBody: "{}",
      body: {
        accountId: "acct-1",
        events: [
          {
            id: "wa-msg-1",
            from: "peer-1",
            text: "hello",
            timestamp: "2026-02-08T00:00:00.000Z",
          },
        ],
      },
    });

    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]).toMatchObject({
      provider: "WHATSAPP",
      transport: "BUSINESS_API",
      accountId: "acct-1",
      peerId: "peer-1",
      externalMessageId: "wa-msg-1",
      content: "hello",
    });
  });

  it("delegates outbound sends", async () => {
    const sendImpl = vi.fn(async () => ({
      providerMessageId: "out-1",
      deliveredAt: "2026-02-08T00:00:01.000Z",
      metadata: { ok: true },
    }));
    const adapter = new WhatsAppBusinessAdapter({
      appSecret: null,
      sendImpl,
    });

    const result = await adapter.sendOutbound({
      provider: "WHATSAPP",
      transport: "BUSINESS_API",
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "done",
      attachments: [],
      chunks: [],
      metadata: {},
    } as any);

    expect(sendImpl).toHaveBeenCalledOnce();
    expect(result.providerMessageId).toBe("out-1");
  });
});
