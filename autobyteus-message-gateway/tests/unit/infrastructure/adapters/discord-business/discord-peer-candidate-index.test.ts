import { describe, expect, it } from "vitest";
import { DiscordPeerCandidateIndex } from "../../../../../src/infrastructure/adapters/discord-business/discord-peer-candidate-index.js";

describe("DiscordPeerCandidateIndex", () => {
  it("exposes the shared account-scoped index behavior through the Discord wrapper", () => {
    const observedAt = new Date().toISOString();
    const index = new DiscordPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "channel:123",
      peerType: "GROUP",
      threadId: "thread-1",
      displayName: "#general",
      lastMessageAt: observedAt,
    });

    const result = index.listCandidates({
      accountId: "discord-acct-1",
      includeGroups: true,
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      peerId: "channel:123",
      threadId: "thread-1",
      displayName: "#general",
      lastMessageAt: observedAt,
    });
  });
});
