import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerRawBodyCaptureHook } from "../../../../src/http/hooks/raw-body-capture.js";
import { registerProviderWebhookRoutes } from "../../../../src/http/routes/provider-webhook-route.js";
import { WhatsAppBusinessAdapter } from "../../../../src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.js";

describe("raw-body-capture hook", () => {
  it("preserves raw payload bytes for signature verification", async () => {
    const adapter = new WhatsAppBusinessAdapter({ appSecret: "secret-1" });
    const inboundMessageService = {
      handleInbound: vi.fn(async () => ({
        accepted: true,
        duplicate: false,
        blocked: false,
        forwarded: true,
        envelopeCount: 1,
      })),
    };

    const app = fastify();
    registerRawBodyCaptureHook(app);
    registerProviderWebhookRoutes(app, {
      inboundMessageService: inboundMessageService as any,
      adaptersByProvider: new Map([["WHATSAPP", adapter]]) as any,
    });

    const rawPayload =
      '{\n  "provider":"WHATSAPP",\n  "transport":"BUSINESS_API",\n  "accountId":"acct-1",\n  "peerId":"peer-1",\n  "peerType":"USER",\n  "threadId":null,\n  "externalMessageId":"msg-1",\n  "content":"hello",\n  "attachments":[],\n  "receivedAt":"2026-02-08T00:00:00.000Z",\n  "metadata":{}\n}';

    const validSignature = adapter.createSignature(rawPayload);

    const accepted = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: {
        "content-type": "application/json",
        "x-whatsapp-signature": validSignature,
      },
      payload: rawPayload,
    });

    expect(accepted.statusCode).toBe(200);

    const minifiedPayload = JSON.stringify(JSON.parse(rawPayload));
    const rejected = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: {
        "content-type": "application/json",
        "x-whatsapp-signature": validSignature,
      },
      payload: minifiedPayload,
    });

    expect(rejected.statusCode).toBe(401);
    expect(rejected.json()).toMatchObject({ code: "INVALID_SIGNATURE" });

    await app.close();
  });
});
