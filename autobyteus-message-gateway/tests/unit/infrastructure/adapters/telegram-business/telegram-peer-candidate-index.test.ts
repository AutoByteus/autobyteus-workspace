import { describe, expect, it } from "vitest";
import { TelegramPeerCandidateIndex } from "../../../../../src/infrastructure/adapters/telegram-business/telegram-peer-candidate-index.js";

describe("TelegramPeerCandidateIndex", () => {
  it("exposes the shared account-scoped index behavior through the Telegram wrapper", () => {
    const observedAt = new Date().toISOString();
    const index = new TelegramPeerCandidateIndex({
      maxCandidatesPerAccount: 10,
      candidateTtlSeconds: 3600,
    });

    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "-1001234567890",
      peerType: "GROUP",
      threadId: "11",
      displayName: "Group",
      lastMessageAt: observedAt,
    });

    const result = index.listCandidates({
      accountId: "telegram-acct-1",
      includeGroups: true,
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      peerId: "-1001234567890",
      threadId: "11",
      displayName: "Group",
      lastMessageAt: observedAt,
    });
  });
});
