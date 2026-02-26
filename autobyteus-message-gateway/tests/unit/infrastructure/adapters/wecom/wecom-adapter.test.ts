import { describe, expect, it } from "vitest";
import { WeComAdapter } from "../../../../../src/infrastructure/adapters/wecom/wecom-adapter.js";

describe("WeComAdapter", () => {
  it("verifies inbound signature with timestamp+nonce+body", () => {
    const adapter = new WeComAdapter({ webhookToken: "token-1" });
    const rawBody = JSON.stringify({ ping: true });
    const timestamp = "1707350400";
    const nonce = "abc123";
    const signature = adapter.createSignature(timestamp, nonce, rawBody);

    const result = adapter.verifyInboundSignature(
      {
        method: "POST",
        path: "/webhooks/wecom",
        headers: {
          "x-wecom-timestamp": timestamp,
          "x-wecom-nonce": nonce,
          "x-wecom-signature": signature,
        },
        query: {},
        body: {},
        rawBody,
      },
      rawBody,
    );

    expect(result.valid).toBe(true);
  });

  it("parses batched events into canonical envelope list", () => {
    const adapter = new WeComAdapter({ webhookToken: null });

    const envelopes = adapter.parseInbound({
      method: "POST",
      path: "/webhooks/wecom",
      headers: {},
      query: {},
      rawBody: "{}",
      body: {
        accountId: "corp-1",
        events: [
          {
            id: "wecom-msg-1",
            from: "group-1",
            peerType: "GROUP",
            text: "hello team",
            timestamp: "2026-02-08T00:00:00.000Z",
          },
        ],
      },
    });

    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]).toMatchObject({
      provider: "WECOM",
      transport: "BUSINESS_API",
      accountId: "corp-1",
      peerId: "group-1",
      externalMessageId: "wecom-msg-1",
      content: "hello team",
    });
  });
});
