import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { WechatPersonalAdapter } from "../../../../../src/infrastructure/adapters/wechat-personal/wechat-personal-adapter.js";
import { HttpWechatySidecarClient } from "../../../../../src/infrastructure/adapters/wechat-personal/wechaty-sidecar-client.js";

const createJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

describe("wechat sidecar contract integration", () => {
  it("maps adapter calls to sidecar open/peer/messages endpoints", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/wechaty/v1/sessions/open")) {
        return createJsonResponse({
          status: "ACTIVE",
          qr: null,
        });
      }
      if (url.includes("/peer-candidates")) {
        return createJsonResponse({
          items: [
            {
              peerId: "peer-1",
              peerType: "USER",
              threadId: null,
              displayName: "Alice",
              lastMessageAt: "2026-02-13T00:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/messages")) {
        return createJsonResponse({
          providerMessageId: "msg-1",
          deliveredAt: "2026-02-13T00:00:00.000Z",
          metadata: {},
        });
      }
      if (url.endsWith("/status")) {
        return createJsonResponse({
          status: "ACTIVE",
          updatedAt: "2026-02-13T00:00:00.000Z",
        });
      }
      if (url.endsWith("/qr")) {
        return createJsonResponse({
          qr: null,
        });
      }
      if (init?.method === "DELETE") {
        return createJsonResponse({});
      }
      throw new Error(`Unexpected sidecar call: ${url}`);
    });

    const sidecarClient = new HttpWechatySidecarClient({
      baseUrl: "https://sidecar.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const adapter = new WechatPersonalAdapter({
      sidecarClient,
      now: () => Date.parse("2026-02-13T00:00:00.000Z"),
    });

    const started = await adapter.startSession({
      accountLabel: "home-wechat",
      qrTtlSeconds: 120,
    });
    await adapter.listSessionPeerCandidates(started.sessionId, {
      limit: 50,
      includeGroups: true,
    });
    await adapter.sendOutbound({
      provider: ExternalChannelProvider.WECHAT,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "home-wechat",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "hello",
      attachments: [],
      chunks: [],
      metadata: {},
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://sidecar.example/api/wechaty/v1/sessions/open",
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/peer-candidates"),
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/messages"),
      expect.anything(),
    );
  });
});
