import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { GatewayCallbackPublisher } from "../../../../src/external-channel/runtime/gateway-callback-publisher.js";

const payload = {
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.PERSONAL_SESSION,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  correlationMessageId: "corr-1",
  callbackIdempotencyKey: "cb-1",
  replyText: "hello",
  attachments: [],
  chunks: [],
  metadata: {},
};

describe("GatewayCallbackPublisher", () => {
  it("posts callback payload with signature headers when secret is configured", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
    });
    const publisher = new GatewayCallbackPublisher({
      baseUrl: "http://localhost:8010",
      sharedSecret: "secret-1",
      fetchFn: fetchFn as any,
    });

    await publisher.publish(payload);

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://localhost:8010/api/server-callback/v1/messages");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-autobyteus-server-signature")).toBeTruthy();
    expect(headers.get("x-autobyteus-server-timestamp")).toBeTruthy();
  });

  it("throws when gateway responds with non-2xx status", async () => {
    const publisher = new GatewayCallbackPublisher({
      baseUrl: "http://localhost:8010",
      fetchFn: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any,
    });

    await expect(publisher.publish(payload)).rejects.toThrow(
      "Gateway callback request failed with status 500.",
    );
  });

  it("throws timeout error when callback request exceeds timeout", async () => {
    const fetchFn = vi.fn((_: string, init?: RequestInit) => {
      return new Promise((_, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }
      });
    });
    const publisher = new GatewayCallbackPublisher({
      baseUrl: "http://localhost:8010",
      timeoutMs: 5,
      fetchFn: fetchFn as any,
    });

    await expect(publisher.publish(payload)).rejects.toThrow(
      "Gateway callback request timed out after 5ms.",
    );
  });
});
