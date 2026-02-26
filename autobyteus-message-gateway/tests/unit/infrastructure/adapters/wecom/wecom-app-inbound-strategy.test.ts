import { describe, expect, it } from "vitest";
import { WeComAdapter } from "../../../../../src/infrastructure/adapters/wecom/wecom-adapter.js";
import { WeComAppInboundStrategy } from "../../../../../src/infrastructure/adapters/wecom/wecom-app-inbound-strategy.js";

describe("WeComAppInboundStrategy", () => {
  it("verifies handshake using signature over echo payload", () => {
    const legacyAdapter = new WeComAdapter({ webhookToken: "token-1" });
    const strategy = new WeComAppInboundStrategy(legacyAdapter);
    const signature = legacyAdapter.createSignature("123", "abc", "echo");

    expect(
      strategy.verifyHandshake({
        timestamp: "123",
        nonce: "abc",
        signature,
        echo: "echo",
      }),
    ).toEqual({
      valid: true,
      code: null,
      detail: "Signature verified.",
    });
  });

  it("parses callback events and normalizes message ids", () => {
    const legacyAdapter = new WeComAdapter({ webhookToken: null });
    const strategy = new WeComAppInboundStrategy(legacyAdapter);

    const envelopes = strategy.parseCallback("corp-main", {
      method: "POST",
      path: "/webhooks/wecom-app/corp-main",
      headers: {},
      query: {},
      rawBody: "{}",
      body: {
        events: [
          {
            from: "user-1",
            text: "hello",
            peerType: "USER",
            timestamp: "2026-02-09T10:00:00.000Z",
          },
        ],
      },
    });

    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]).toMatchObject({
      provider: "WECOM",
      transport: "BUSINESS_API",
      accountId: "corp-main",
      peerId: "user-1",
      content: "hello",
    });
    expect(envelopes[0].externalMessageId).toMatch(/^wecom-hash-/);
  });
});
