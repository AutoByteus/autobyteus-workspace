import { describe, expect, it, vi } from "vitest";
import { HttpWechatySidecarClient } from "../../../../../src/infrastructure/adapters/wechat-personal/wechaty-sidecar-client.js";

const createJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

describe("HttpWechatySidecarClient", () => {
  it("calls openSession with expected endpoint and payload", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        status: "PENDING_QR",
        qr: {
          code: "qr-1",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      }),
    );
    const client = new HttpWechatySidecarClient({
      baseUrl: "https://sidecar.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.openSession({
      sessionId: "session-1",
      accountLabel: "home-wechat",
      qrTtlSeconds: 120,
    });

    expect(result).toMatchObject({
      status: "PENDING_QR",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://sidecar.example/api/wechaty/v1/sessions/open",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-1",
          accountLabel: "home-wechat",
          qrTtlSeconds: 120,
        }),
      }),
    );
  });

  it("uses /messages endpoint for outbound text sends", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        providerMessageId: "msg-1",
        deliveredAt: "2026-02-13T00:00:00.000Z",
        metadata: {},
      }),
    );
    const client = new HttpWechatySidecarClient({
      baseUrl: "https://sidecar.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.sendText({
      sessionId: "session-1",
      peerId: "peer-1",
      threadId: null,
      text: "hello",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://sidecar.example/api/wechaty/v1/sessions/session-1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          peerId: "peer-1",
          threadId: null,
          text: "hello",
        }),
      }),
    );
  });

  it("sends peer-candidate query options to sidecar endpoint", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        items: [],
      }),
    );
    const client = new HttpWechatySidecarClient({
      baseUrl: "https://sidecar.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.listPeerCandidates("session-1", {
      limit: 50,
      includeGroups: false,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://sidecar.example/api/wechaty/v1/sessions/session-1/peer-candidates?limit=50&includeGroups=false",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
