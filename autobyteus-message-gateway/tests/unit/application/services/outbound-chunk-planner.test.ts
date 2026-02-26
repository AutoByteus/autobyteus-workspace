import { describe, expect, it } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { OutboundChunkPlanner } from "../../../../src/application/services/outbound-chunk-planner.js";

describe("OutboundChunkPlanner", () => {
  it("returns pre-planned chunks unchanged", () => {
    const planner = new OutboundChunkPlanner();
    const chunks = planner.planChunks({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "hello",
      attachments: [],
      chunks: [{ index: 0, text: "chunk-1" }],
      metadata: {},
    });

    expect(chunks).toEqual([{ index: 0, text: "chunk-1" }]);
  });

  it("splits long text into multiple chunks", () => {
    const planner = new OutboundChunkPlanner();
    const longText = Array.from({ length: 2000 })
      .map(() => "word")
      .join(" ");

    const chunks = planner.planChunks({
      provider: ExternalChannelProvider.WECHAT,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: longText,
      attachments: [],
      chunks: [],
      metadata: {},
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks.every((chunk) => chunk.text.length > 0)).toBe(true);
  });

  it("throws for empty outbound text", () => {
    const planner = new OutboundChunkPlanner();
    expect(() =>
      planner.planChunks({
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: null,
        correlationMessageId: "corr-1",
        callbackIdempotencyKey: "cb-1",
        replyText: "   ",
        attachments: [],
        chunks: [],
        metadata: {},
      }),
    ).toThrow("INVALID_OUTBOUND_TEXT");
  });

  it("uses 2000-char chunk limit for DISCORD business api", () => {
    const planner = new OutboundChunkPlanner();
    const longText = "x".repeat(4500);

    const chunks = planner.planChunks({
      provider: ExternalChannelProvider.DISCORD,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "channel:123",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: longText,
      attachments: [],
      chunks: [],
      metadata: {},
    });

    expect(chunks.length).toBe(3);
    expect(chunks.every((chunk) => chunk.text.length <= 2000)).toBe(true);
  });
});
