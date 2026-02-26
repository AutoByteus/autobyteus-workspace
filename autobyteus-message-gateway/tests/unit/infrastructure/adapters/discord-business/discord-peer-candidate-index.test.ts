import { describe, expect, it } from "vitest";
import { DiscordPeerCandidateIndex } from "../../../../../src/infrastructure/adapters/discord-business/discord-peer-candidate-index.js";

describe("DiscordPeerCandidateIndex", () => {
  it("deduplicates by canonical peer/thread and keeps latest observation", () => {
    const baseTime = Date.now();
    const index = new DiscordPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "channel:123",
      peerType: "GROUP",
      threadId: "thread-1",
      displayName: "First",
      lastMessageAt: new Date(baseTime - 1000).toISOString(),
    });
    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "channel:123",
      peerType: "GROUP",
      threadId: "thread-1",
      displayName: "Updated",
      lastMessageAt: new Date(baseTime).toISOString(),
    });

    const result = index.listCandidates({
      accountId: "discord-acct-1",
      includeGroups: true,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      peerId: "channel:123",
      threadId: "thread-1",
      displayName: "Updated",
      lastMessageAt: new Date(baseTime).toISOString(),
    });
  });

  it("enforces includeGroups and limit filters", () => {
    const baseTime = Date.now();
    const index = new DiscordPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "user:111",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: new Date(baseTime - 1000).toISOString(),
    });
    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "channel:222",
      peerType: "GROUP",
      threadId: null,
      displayName: "#general",
      lastMessageAt: new Date(baseTime).toISOString(),
    });

    const usersOnly = index.listCandidates({
      accountId: "discord-acct-1",
      includeGroups: false,
      limit: 10,
    });
    expect(usersOnly.items).toEqual([
      expect.objectContaining({
        peerId: "user:111",
      }),
    ]);

    const limited = index.listCandidates({
      accountId: "discord-acct-1",
      includeGroups: true,
      limit: 1,
    });
    expect(limited.items).toHaveLength(1);
    expect(limited.items[0]?.peerId).toBe("channel:222");
  });

  it("drops expired candidates on prune/list", () => {
    const index = new DiscordPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 1,
    });

    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "user:111",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: "2026-02-10T10:05:00.000Z",
    });

    index.pruneExpired(new Date("2026-02-10T10:05:02.500Z").getTime());

    const result = index.listCandidates({
      accountId: "discord-acct-1",
      includeGroups: true,
      limit: 10,
    });
    expect(result.items).toEqual([]);
  });
});
