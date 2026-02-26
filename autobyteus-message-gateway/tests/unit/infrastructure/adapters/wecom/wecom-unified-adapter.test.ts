import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { WeComAdapter } from "../../../../../src/infrastructure/adapters/wecom/wecom-adapter.js";
import { WeComAppInboundStrategy } from "../../../../../src/infrastructure/adapters/wecom/wecom-app-inbound-strategy.js";
import { WeComAppOutboundStrategy } from "../../../../../src/infrastructure/adapters/wecom/wecom-app-outbound-strategy.js";
import { WeComUnifiedAdapter } from "../../../../../src/infrastructure/adapters/wecom/wecom-unified-adapter.js";
import { WeComAccountRegistry } from "../../../../../src/infrastructure/adapters/wecom/wecom-account-registry.js";

describe("WeComUnifiedAdapter", () => {
  it("routes outbound to APP strategy when account mode is APP", async () => {
    const legacyAdapter = new WeComAdapter({
      webhookToken: null,
      sendImpl: async () => ({
        providerMessageId: "legacy",
        deliveredAt: "2026-02-09T10:00:00.000Z",
        metadata: {
          mode: "LEGACY",
        },
      }),
    });
    const appSend = vi.fn(async () => ({
      providerMessageId: "app",
      deliveredAt: "2026-02-09T10:00:00.000Z",
      metadata: {
        mode: "APP",
      },
    }));
    const adapter = new WeComUnifiedAdapter({
      legacyAdapter,
      accountRegistry: new WeComAccountRegistry([
        { accountId: "corp-main", label: "Corp Main", mode: "APP" },
      ]),
      appInboundStrategy: new WeComAppInboundStrategy(legacyAdapter),
      appOutboundStrategy: new WeComAppOutboundStrategy({ sendImpl: appSend }),
    });

    const result = await adapter.sendOutbound({
      provider: ExternalChannelProvider.WECOM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "corp-main",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "hello",
      attachments: [],
      chunks: [],
      metadata: {},
    });

    expect(appSend).toHaveBeenCalledOnce();
    expect(result.providerMessageId).toBe("app");
  });

  it("falls back to legacy outbound when account is not app-managed", async () => {
    const legacyAdapter = new WeComAdapter({
      webhookToken: null,
      sendImpl: async () => ({
        providerMessageId: "legacy",
        deliveredAt: "2026-02-09T10:00:00.000Z",
        metadata: {
          mode: "LEGACY",
        },
      }),
    });
    const appSend = vi.fn(async () => ({
      providerMessageId: "app",
      deliveredAt: "2026-02-09T10:00:00.000Z",
      metadata: {
        mode: "APP",
      },
    }));
    const adapter = new WeComUnifiedAdapter({
      legacyAdapter,
      accountRegistry: new WeComAccountRegistry([]),
      appInboundStrategy: new WeComAppInboundStrategy(legacyAdapter),
      appOutboundStrategy: new WeComAppOutboundStrategy({ sendImpl: appSend }),
    });

    const result = await adapter.sendOutbound({
      provider: ExternalChannelProvider.WECOM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "unknown",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "hello",
      attachments: [],
      chunks: [],
      metadata: {},
    });

    expect(appSend).not.toHaveBeenCalled();
    expect(result.providerMessageId).toBe("legacy");
  });
});
