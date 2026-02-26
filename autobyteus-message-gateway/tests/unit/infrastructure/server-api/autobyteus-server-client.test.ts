import { describe, expect, it, vi } from "vitest";
import { createServerSignature } from "../../../../src/infrastructure/server-api/server-signature.js";
import { AutobyteusServerClient } from "../../../../src/infrastructure/server-api/autobyteus-server-client.js";

describe("AutobyteusServerClient", () => {
  it("posts inbound payload and maps accepted/duplicate response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          accepted: true,
          duplicate: false,
          disposition: "ROUTED",
          bindingResolved: true,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new AutobyteusServerClient({
      baseUrl: "https://server.example",
      sharedSecret: null,
      fetchImpl: fetchImpl as any,
    });

    const result = await client.forwardInbound({
      provider: "WHATSAPP",
      transport: "BUSINESS_API",
      accountId: "acct-1",
      peerId: "peer-1",
      peerType: "USER",
      threadId: null,
      externalMessageId: "msg-1",
      content: "hello",
      attachments: [],
      receivedAt: "2026-02-08T00:00:00.000Z",
      metadata: {},
    } as any);

    expect(result).toEqual({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const firstCall = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    const [url, init] = firstCall;
    expect(url.toString()).toBe("https://server.example/rest/api/channel-ingress/v1/messages");
    expect(init.method).toBe("POST");
  });

  it("adds gateway signature headers when shared secret is configured", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-02-08T00:00:00.000Z"));

      const fetchImpl = vi.fn(async () =>
        new Response(
          JSON.stringify({
            accepted: true,
            duplicate: false,
            disposition: "ROUTED",
            bindingResolved: true,
          }),
          {
          status: 200,
          headers: { "content-type": "application/json" },
          },
        ),
      );

      const client = new AutobyteusServerClient({
        baseUrl: "https://server.example",
        sharedSecret: "shared-secret",
        fetchImpl: fetchImpl as any,
      });

      const payload = {
        provider: "WHATSAPP",
        transport: "BUSINESS_API",
        accountId: "acct-1",
        peerId: "peer-1",
        peerType: "USER",
        threadId: null,
        externalMessageId: "msg-1",
        content: "hello",
        attachments: [],
        receivedAt: "2026-02-08T00:00:00.000Z",
        metadata: {},
      };
      await client.forwardInbound(payload as any);

      const firstCall = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
      const [, init] = firstCall;
      const headers = init.headers as Headers;
      const timestamp = "1770508800";
      const body = JSON.stringify(payload);

      expect(headers.get("x-autobyteus-gateway-timestamp")).toBe(timestamp);
      expect(headers.get("x-autobyteus-gateway-signature")).toBe(
        createServerSignature(body, timestamp, "shared-secret"),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws on non-2xx delivery-event response", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad", { status: 500 }));
    const client = new AutobyteusServerClient({
      baseUrl: "https://server.example",
      sharedSecret: null,
      fetchImpl: fetchImpl as any,
    });

    await expect(
      client.postDeliveryEvent({
        provider: "WHATSAPP",
        transport: "BUSINESS_API",
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: null,
        correlationMessageId: "corr-1",
        callbackIdempotencyKey: "cb-1",
        status: "FAILED",
        occurredAt: "2026-02-08T00:00:00.000Z",
        metadata: {},
      } as any),
    ).rejects.toThrowError(
      "Server request failed for /rest/api/channel-ingress/v1/delivery-events with status 500.",
    );
  });

  it("rejects responses with unknown or missing disposition", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ accepted: true, duplicate: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new AutobyteusServerClient({
      baseUrl: "https://server.example",
      sharedSecret: null,
      fetchImpl: fetchImpl as any,
    });

    await expect(
      client.forwardInbound({
        provider: "WHATSAPP",
        transport: "BUSINESS_API",
        accountId: "acct-1",
        peerId: "peer-1",
        peerType: "USER",
        threadId: null,
        externalMessageId: "msg-legacy",
        content: "hello",
        attachments: [],
        receivedAt: "2026-02-08T00:00:00.000Z",
        metadata: {},
      } as any),
    ).rejects.toThrow(
      "Server ingress response contains unsupported disposition: undefined.",
    );
  });
});
