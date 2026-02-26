import { describe, expect, it } from "vitest";
import {
  TelegramPeerDiscoveryNotEnabledError,
  TelegramPeerDiscoveryService,
} from "../../../../src/application/services/telegram-peer-discovery-service.js";
import { TelegramPeerCandidateIndex } from "../../../../src/infrastructure/adapters/telegram-business/telegram-peer-candidate-index.js";

describe("TelegramPeerDiscoveryService", () => {
  it("returns candidates from index when enabled", async () => {
    const nowIso = new Date().toISOString();
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
      lastMessageAt: nowIso,
    });

    const service = new TelegramPeerDiscoveryService(index, {
      enabled: true,
      accountId: "telegram-acct-1",
    });
    const result = await service.listPeerCandidates();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.peerId).toBe("100200300");
  });

  it("throws typed disabled error when discovery is not enabled", async () => {
    const service = new TelegramPeerDiscoveryService(null, {
      enabled: false,
      accountId: null,
    });

    await expect(service.listPeerCandidates()).rejects.toBeInstanceOf(
      TelegramPeerDiscoveryNotEnabledError,
    );
  });
});
