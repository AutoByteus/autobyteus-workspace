import { describe, expect, it } from "vitest";
import { ChannelMentionPolicyService } from "../../../../src/application/services/channel-mention-policy-service.js";

const service = new ChannelMentionPolicyService();

describe("ChannelMentionPolicyService", () => {
  it("allows non-group messages", () => {
    const result = service.evaluateIfGroup({ peerType: "USER", metadata: {} } as any);
    expect(result).toEqual({ allowed: true, reason: "ALLOWED" });
  });

  it("blocks group messages without mention", () => {
    const result = service.evaluateIfGroup({ peerType: "GROUP", metadata: {} } as any);
    expect(result).toEqual({ allowed: false, reason: "GROUP_MENTION_REQUIRED" });
  });

  it("allows group messages when mention metadata is present", () => {
    const result = service.evaluateIfGroup({
      peerType: "GROUP",
      metadata: { mentioned: true },
    } as any);
    expect(result).toEqual({ allowed: true, reason: "ALLOWED" });
  });
});
