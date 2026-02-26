import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { WeComAppOutboundStrategy } from "../../../../../src/infrastructure/adapters/wecom/wecom-app-outbound-strategy.js";

describe("WeComAppOutboundStrategy", () => {
  it("delegates sending through configured outbound implementation", async () => {
    const sendImpl = vi.fn(async () => ({
      providerMessageId: "out-1",
      deliveredAt: "2026-02-09T10:00:00.000Z",
      metadata: {
        mode: "APP",
      },
    }));
    const strategy = new WeComAppOutboundStrategy({ sendImpl });

    const result = await strategy.send({
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

    expect(sendImpl).toHaveBeenCalledOnce();
    expect(result.providerMessageId).toBe("out-1");
  });
});
