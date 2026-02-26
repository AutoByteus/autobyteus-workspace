import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerProviderWebhookRoutes } from "../../../../src/http/routes/provider-webhook-route.js";

describe("provider-webhook-route", () => {
  it("accepts webhook and forwards inbound envelope through service", async () => {
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
    registerProviderWebhookRoutes(app, {
      inboundMessageService: inboundMessageService as any,
      adaptersByProvider: new Map([
        [
          "WHATSAPP",
          {
            verifyInboundSignature: () => ({ valid: true, code: null, detail: "ok" }),
          },
        ],
      ]) as any,
    });

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      payload: {
        provider: "WHATSAPP",
        transport: "BUSINESS_API",
        accountId: "acct-1",
        peerId: "peer-1",
        peerType: "USER",
        threadId: null,
        externalMessageId: "msg-1",
        content: "hello",
        attachments: [
          {
            kind: "image",
            url: "data:image/jpeg;base64,ZmFrZQ==",
            mimeType: "image/jpeg",
            fileName: "wa-photo.jpg",
            sizeBytes: 4,
            metadata: { source: "integration-test" },
          },
        ],
        receivedAt: "2026-02-08T00:00:00.000Z",
        metadata: {},
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      forwarded: true,
    });
    expect(inboundMessageService.handleInbound).toHaveBeenCalledOnce();
    const mappedRequest = (inboundMessageService.handleInbound as any).mock.calls[0][1];
    expect(mappedRequest.body.attachments).toMatchObject([
      {
        kind: "image",
        url: "data:image/jpeg;base64,ZmFrZQ==",
        mimeType: "image/jpeg",
        fileName: "wa-photo.jpg",
        sizeBytes: 4,
      },
    ]);

    await app.close();
  });

  it("supports Telegram through shared provider webhook route", async () => {
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
    registerProviderWebhookRoutes(app, {
      inboundMessageService: inboundMessageService as any,
      adaptersByProvider: new Map([
        [
          "TELEGRAM",
          {
            verifyInboundSignature: (request: { headers: Record<string, string | undefined> }) => ({
              valid: request.headers["x-telegram-bot-api-secret-token"] === "secret-token",
              code: "INVALID_SIGNATURE",
              detail: "signature mismatch",
            }),
          },
        ],
      ]) as any,
    });

    const unauthorized = await app.inject({
      method: "POST",
      url: "/webhooks/telegram",
      payload: {},
    });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toMatchObject({
      code: "INVALID_SIGNATURE",
    });

    const authorized = await app.inject({
      method: "POST",
      url: "/webhooks/telegram",
      headers: {
        "x-telegram-bot-api-secret-token": "secret-token",
      },
      payload: {
        update_id: 5001,
        message: {
          message_id: 7001,
          date: 1739404800,
          text: "hello",
          chat: {
            id: 100200300,
            type: "private",
          },
        },
      },
    });

    expect(authorized.statusCode).toBe(200);
    expect(inboundMessageService.handleInbound).toHaveBeenCalledOnce();
    expect((inboundMessageService.handleInbound as any).mock.calls[0][0]).toBe("TELEGRAM");

    await app.close();
  });
});
