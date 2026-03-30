import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerWeComAppWebhookRoutes } from "../../../../src/http/routes/wecom-app-webhook-route.js";
import { WeComAccountRegistry } from "../../../../src/infrastructure/adapters/wecom/wecom-account-registry.js";

describe("wecom-app-webhook-route", () => {
  it("returns echo on valid handshake request", async () => {
    const app = fastify();
    registerWeComAppWebhookRoutes(app, {
      inboundMessageService: {
        handleInbound: vi.fn(),
      } as any,
      wecomAdapter: {
        verifyInboundSignature: vi.fn(),
        verifyHandshake: vi.fn().mockReturnValue({
          valid: true,
          code: null,
          detail: "Signature verified.",
        }),
      },
      accountRegistry: new WeComAccountRegistry([
        {
          accountId: "corp-main",
          label: "Corporate Main",
          mode: "APP",
        },
      ]),
    });

    const response = await app.inject({
      method: "GET",
      url: "/webhooks/wecom-app/corp-main?timestamp=t1&nonce=n1&signature=sig-ok&echostr=echo-123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("echo-123");

    await app.close();
  });

  it("returns 404 for unknown account ids", async () => {
    const app = fastify();
    registerWeComAppWebhookRoutes(app, {
      inboundMessageService: {
        handleInbound: vi.fn(),
      } as any,
      wecomAdapter: {
        verifyInboundSignature: vi.fn(),
        verifyHandshake: vi.fn().mockReturnValue({
          valid: true,
          code: null,
          detail: "Signature verified.",
        }),
      },
      accountRegistry: new WeComAccountRegistry([]),
    });

    const response = await app.inject({
      method: "GET",
      url: "/webhooks/wecom-app/missing?timestamp=t1&nonce=n1&signature=sig-ok&echostr=echo-123",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: "ACCOUNT_NOT_CONFIGURED",
    });

    await app.close();
  });

  it("forwards valid callback payloads through inbound service", async () => {
    const handleInbound = vi.fn(async () => ({
      accepted: true,
      duplicate: false,
      queued: true,
      envelopeCount: 1,
    }));

    const app = fastify();
    registerWeComAppWebhookRoutes(app, {
      inboundMessageService: {
        handleInbound,
      } as any,
      wecomAdapter: {
        verifyInboundSignature: vi.fn().mockReturnValue({
          valid: true,
          code: null,
          detail: "ok",
        }),
        verifyHandshake: vi.fn(),
      },
      accountRegistry: new WeComAccountRegistry([
        {
          accountId: "corp-main",
          label: "Corporate Main",
          mode: "APP",
        },
      ]),
    });

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/wecom-app/corp-main",
      payload: {
        provider: "WECOM",
        transport: "BUSINESS_API",
        accountId: "corp-main",
        peerId: "peer-1",
        peerType: "USER",
        threadId: null,
        externalMessageId: "msg-1",
        content: "hello",
        attachments: [],
        receivedAt: "2026-02-09T10:00:00.000Z",
        metadata: {},
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      accepted: true,
      queued: true,
    });
    expect(handleInbound).toHaveBeenCalledOnce();

    await app.close();
  });

  it("returns 401 and does not forward callback when signature is invalid", async () => {
    const handleInbound = vi.fn();

    const app = fastify();
    registerWeComAppWebhookRoutes(app, {
      inboundMessageService: {
        handleInbound,
      } as any,
      wecomAdapter: {
        verifyInboundSignature: vi.fn().mockReturnValue({
          valid: false,
          code: "INVALID_SIGNATURE",
          detail: "invalid signature",
        }),
        verifyHandshake: vi.fn(),
      },
      accountRegistry: new WeComAccountRegistry([
        {
          accountId: "corp-main",
          label: "Corporate Main",
          mode: "APP",
        },
      ]),
    });

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/wecom-app/corp-main",
      payload: {
        provider: "WECOM",
        transport: "BUSINESS_API",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      code: "INVALID_SIGNATURE",
    });
    expect(handleInbound).not.toHaveBeenCalled();

    await app.close();
  });
});
