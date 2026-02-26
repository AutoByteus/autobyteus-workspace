import { describe, expect, it } from "vitest";
import { InboundClassifierService } from "../../../../src/application/services/inbound-classifier-service.js";
import { ChannelMentionPolicyService } from "../../../../src/application/services/channel-mention-policy-service.js";

const buildEnvelope = (metadata: Record<string, unknown>) => ({
  provider: "DISCORD",
  transport: "BUSINESS_API",
  accountId: "acc-1",
  peerId: "channel:1",
  peerType: "GROUP",
  threadId: null,
  externalMessageId: "m-1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-12T00:00:00.000Z",
  metadata,
  routingKey: "DISCORD:BUSINESS_API:acc-1:channel:1:_",
});

describe("InboundClassifierService", () => {
  it("returns FORWARDABLE when mention policy allows the envelope", () => {
    const service = new InboundClassifierService(new ChannelMentionPolicyService());
    const result = service.classify(
      buildEnvelope({
        mentioned: true,
      }) as any,
    );
    expect(result).toEqual({
      decision: "FORWARDABLE",
    });
  });

  it("returns BLOCKED when mention policy blocks group envelope", () => {
    const service = new InboundClassifierService(new ChannelMentionPolicyService());
    const result = service.classify(buildEnvelope({}) as any);
    expect(result).toEqual({
      decision: "BLOCKED",
      reason: "GROUP_MENTION_REQUIRED",
    });
  });
});
