import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createServerSignature } from "../../../../src/infrastructure/server-api/server-signature.js";
import { registerServerCallbackRoutes } from "../../../../src/http/routes/server-callback-route.js";

const createPayload = () => ({
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
});

describe("server-callback-route", () => {
  it("returns 401 when callback secret is configured and signature is missing", async () => {
    const app = fastify();
    registerServerCallbackRoutes(app, {
      outboundOutboxService: {
        enqueueOrGet: vi.fn(),
      } as any,
      serverCallbackSharedSecret: "secret-1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/server-callback/v1/messages",
      payload: createPayload(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("MISSING_SIGNATURE");
    await app.close();
  });

  it("returns 401 when callback secret is missing in strict mode", async () => {
    const app = fastify();
    registerServerCallbackRoutes(app, {
      outboundOutboxService: {
        enqueueOrGet: vi.fn(),
      } as any,
      serverCallbackSharedSecret: null,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/server-callback/v1/messages",
      payload: createPayload(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("MISSING_SECRET");
    await app.close();
  });

  it("enqueues callback payload and returns queued response", async () => {
    const enqueueOrGet = vi.fn(async () => ({
      duplicate: false,
      record: {
        id: "outbox-1",
      },
    }));

    const app = fastify();
    const payload = {
      ...createPayload(),
      callbackIdempotencyKey: "cb-2",
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createServerSignature(rawBody, timestamp, "secret-1");

    registerServerCallbackRoutes(app, {
      outboundOutboxService: {
        enqueueOrGet,
      } as any,
      serverCallbackSharedSecret: "secret-1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/server-callback/v1/messages",
      payload,
      headers: {
        "x-autobyteus-server-signature": signature,
        "x-autobyteus-server-timestamp": timestamp,
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      duplicate: false,
      queued: true,
    });
    expect(enqueueOrGet).toHaveBeenCalledWith("cb-2", expect.objectContaining(payload));

    await app.close();
  });

  it("returns duplicate=true when outbox dispatch key already exists", async () => {
    const enqueueOrGet = vi.fn(async () => ({
      duplicate: true,
      record: {
        id: "outbox-1",
      },
    }));

    const app = fastify();
    registerServerCallbackRoutes(app, {
      outboundOutboxService: {
        enqueueOrGet,
      } as any,
      serverCallbackSharedSecret: null,
      allowInsecureServerCallbacks: true,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/server-callback/v1/messages",
      payload: createPayload(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      duplicate: true,
      queued: true,
    });

    await app.close();
  });
});
