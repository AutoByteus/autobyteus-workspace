import { describe, expect, it } from "vitest";
import { TelegramPeerCandidateIndex } from "../../../../../src/infrastructure/adapters/telegram-business/telegram-peer-candidate-index.js";

describe("TelegramPeerCandidateIndex", () => {
  it("deduplicates by canonical peer/thread and keeps latest observation", () => {
    const baseTime = Date.now();
    const index = new TelegramPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "-1001234567890",
      peerType: "GROUP",
      threadId: "11",
      displayName: "First",
      lastMessageAt: new Date(baseTime - 1000).toISOString(),
    });
    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "-1001234567890",
      peerType: "GROUP",
      threadId: "11",
      displayName: "Updated",
      lastMessageAt: new Date(baseTime).toISOString(),
    });

    const result = index.listCandidates({
      accountId: "telegram-acct-1",
      includeGroups: true,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      peerId: "-1001234567890",
      threadId: "11",
      displayName: "Updated",
      lastMessageAt: new Date(baseTime).toISOString(),
    });
  });

  it("enforces includeGroups and limit filters", () => {
    const baseTime = Date.now();
    const index = new TelegramPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "100200300",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: new Date(baseTime - 1000).toISOString(),
    });
    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "-1001234567890",
      peerType: "GROUP",
      threadId: null,
      displayName: "Group",
      lastMessageAt: new Date(baseTime).toISOString(),
    });

    const usersOnly = index.listCandidates({
      accountId: "telegram-acct-1",
      includeGroups: false,
      limit: 10,
    });
    expect(usersOnly.items).toEqual([
      expect.objectContaining({
        peerId: "100200300",
      }),
    ]);

    const limited = index.listCandidates({
      accountId: "telegram-acct-1",
      includeGroups: true,
      limit: 1,
    });
    expect(limited.items).toHaveLength(1);
    expect(limited.items[0]?.peerId).toBe("-1001234567890");
  });

  it("drops expired candidates on prune/list", () => {
    const index = new TelegramPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 1,
    });

    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "100200300",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: "2026-02-10T10:05:00.000Z",
    });

    index.pruneExpired(new Date("2026-02-10T10:05:02.500Z").getTime());

    const result = index.listCandidates({
      accountId: "telegram-acct-1",
      includeGroups: true,
      limit: 10,
    });
    expect(result.items).toEqual([]);
  });
});
