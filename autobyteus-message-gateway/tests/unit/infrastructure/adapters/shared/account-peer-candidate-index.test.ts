import { describe, expect, it } from "vitest";
import { AccountPeerCandidateIndex } from "../../../../../src/infrastructure/adapters/shared/account-peer-candidate-index.js";

describe("AccountPeerCandidateIndex", () => {
  it("deduplicates by canonical peer/thread and keeps the latest observation", () => {
    const baseTime = Date.now();
    const index = new AccountPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "acct-1",
      peerId: "peer-1",
      peerType: "GROUP",
      threadId: "thread-1",
      displayName: "First",
      lastMessageAt: new Date(baseTime - 1000).toISOString(),
    });
    index.recordObservation({
      accountId: "acct-1",
      peerId: "peer-1",
      peerType: "GROUP",
      threadId: "thread-1",
      displayName: "Updated",
      lastMessageAt: new Date(baseTime).toISOString(),
    });

    const result = index.listCandidates({
      accountId: "acct-1",
      includeGroups: true,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      peerId: "peer-1",
      threadId: "thread-1",
      displayName: "Updated",
      lastMessageAt: new Date(baseTime).toISOString(),
    });
  });

  it("enforces includeGroups and limit filters", () => {
    const baseTime = Date.now();
    const index = new AccountPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "acct-1",
      peerId: "user-1",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: new Date(baseTime - 1000).toISOString(),
    });
    index.recordObservation({
      accountId: "acct-1",
      peerId: "group-1",
      peerType: "GROUP",
      threadId: null,
      displayName: "Group",
      lastMessageAt: new Date(baseTime).toISOString(),
    });

    const usersOnly = index.listCandidates({
      accountId: "acct-1",
      includeGroups: false,
      limit: 10,
    });
    expect(usersOnly.items).toEqual([
      expect.objectContaining({
        peerId: "user-1",
      }),
    ]);

    const limited = index.listCandidates({
      accountId: "acct-1",
      includeGroups: true,
      limit: 1,
    });
    expect(limited.items).toHaveLength(1);
    expect(limited.items[0]?.peerId).toBe("group-1");
  });

  it("drops expired candidates on prune/list", () => {
    const index = new AccountPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 1,
    });

    index.recordObservation({
      accountId: "acct-1",
      peerId: "user-1",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: "2026-02-10T10:05:00.000Z",
    });

    index.pruneExpired(new Date("2026-02-10T10:05:02.500Z").getTime());

    const result = index.listCandidates({
      accountId: "acct-1",
      includeGroups: true,
      limit: 10,
    });
    expect(result.items).toEqual([]);
  });
});
