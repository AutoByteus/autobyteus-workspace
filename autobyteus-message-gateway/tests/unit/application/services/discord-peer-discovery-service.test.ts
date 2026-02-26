import { describe, expect, it } from "vitest";
import {
  DiscordPeerDiscoveryNotEnabledError,
  DiscordPeerDiscoveryService,
} from "../../../../src/application/services/discord-peer-discovery-service.js";
import { DiscordPeerCandidateIndex } from "../../../../src/infrastructure/adapters/discord-business/discord-peer-candidate-index.js";

describe("DiscordPeerDiscoveryService", () => {
  it("returns candidates from index when enabled", async () => {
    const nowIso = new Date().toISOString();
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
      lastMessageAt: nowIso,
    });

    const service = new DiscordPeerDiscoveryService(index, {
      enabled: true,
      accountId: "discord-acct-1",
    });
    const result = await service.listPeerCandidates();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.peerId).toBe("user:111");
  });

  it("throws typed disabled error when discovery is not enabled", async () => {
    const service = new DiscordPeerDiscoveryService(null, {
      enabled: false,
      accountId: null,
    });

    await expect(service.listPeerCandidates()).rejects.toBeInstanceOf(
      DiscordPeerDiscoveryNotEnabledError,
    );
  });
});
