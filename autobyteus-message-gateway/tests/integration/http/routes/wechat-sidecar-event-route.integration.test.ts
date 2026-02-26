import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createWechatSidecarSignature } from "../../../../src/infrastructure/adapters/wechat-personal/wechat-sidecar-signature.js";
import { registerWechatSidecarEventRoutes } from "../../../../src/http/routes/wechat-sidecar-event-route.js";

const createPayload = () => ({
  sessionId: "wechat-personal-session-1",
  accountLabel: "home-wechat",
  peerId: "peer-1",
  peerType: "USER",
  threadId: null,
  messageId: "msg-1",
  content: "hello",
  receivedAt: "2026-02-10T10:00:00.000Z",
  metadata: {},
});

describe("wechat-sidecar-event-route", () => {
  it("returns 401 when signature is missing", async () => {
    const app = fastify();
    registerWechatSidecarEventRoutes(app, {
      wechatPersonalAdapter: {
        ingestInboundEvent: vi.fn(async () => undefined),
      },
      sidecarSharedSecret: "secret-1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/wechat-sidecar/v1/events",
      payload: createPayload(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      code: "MISSING_SIGNATURE",
    });
    await app.close();
  });

  it("accepts valid signed events and forwards to adapter ingress", async () => {
    const app = fastify();
    const ingestInboundEvent = vi.fn(async () => undefined);
    const payload = createPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createWechatSidecarSignature(rawBody, timestamp, "secret-1");

    registerWechatSidecarEventRoutes(app, {
      wechatPersonalAdapter: {
        ingestInboundEvent,
      },
      sidecarSharedSecret: "secret-1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/wechat-sidecar/v1/events",
      payload,
      headers: {
        "x-autobyteus-sidecar-signature": signature,
        "x-autobyteus-sidecar-timestamp": timestamp,
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
    });
    expect(ingestInboundEvent).toHaveBeenCalledWith(expect.objectContaining(payload));
    await app.close();
  });

  it("returns 401 when sidecar timestamp is outside the allowed window", async () => {
    const app = fastify();
    const payload = createPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = "0";
    const signature = createWechatSidecarSignature(rawBody, timestamp, "secret-1");

    registerWechatSidecarEventRoutes(app, {
      wechatPersonalAdapter: {
        ingestInboundEvent: vi.fn(async () => undefined),
      },
      sidecarSharedSecret: "secret-1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/wechat-sidecar/v1/events",
      payload,
      headers: {
        "x-autobyteus-sidecar-signature": signature,
        "x-autobyteus-sidecar-timestamp": timestamp,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      code: "TIMESTAMP_OUT_OF_RANGE",
    });
    await app.close();
  });

  it("returns 400 when adapter ingress rejects payload", async () => {
    const app = fastify();
    const payload = createPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createWechatSidecarSignature(rawBody, timestamp, "secret-1");

    registerWechatSidecarEventRoutes(app, {
      wechatPersonalAdapter: {
        ingestInboundEvent: vi.fn(async () => {
          throw new Error("receivedAt must be an ISO timestamp.");
        }),
      },
      sidecarSharedSecret: "secret-1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/wechat-sidecar/v1/events",
      payload,
      headers: {
        "x-autobyteus-sidecar-signature": signature,
        "x-autobyteus-sidecar-timestamp": timestamp,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: "INVALID_SIDECAR_EVENT",
      detail: "receivedAt must be an ISO timestamp.",
    });
    await app.close();
  });
});
