import { describe, expect, it } from "vitest";
import { PersonalPeerCandidateIndex } from "../../../../../src/infrastructure/adapters/whatsapp-personal/personal-peer-candidate-index.js";

describe("PersonalPeerCandidateIndex", () => {
  it("deduplicates by peerId/threadId and keeps newest timestamp", () => {
    const index = new PersonalPeerCandidateIndex(10);

    index.recordObservation("session-1", {
      peerId: "491701111111@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      observedAt: "2026-02-09T09:00:00.000Z",
    });
    index.recordObservation("session-1", {
      peerId: "491701111111@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      displayName: "Alice Updated",
      observedAt: "2026-02-09T09:05:00.000Z",
    });

    const result = index.listCandidates("session-1", { includeGroups: true, limit: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      peerId: "491701111111@s.whatsapp.net",
      displayName: "Alice Updated",
      lastMessageAt: "2026-02-09T09:05:00.000Z",
    });
  });

  it("filters group candidates when includeGroups is false", () => {
    const index = new PersonalPeerCandidateIndex(10);

    index.recordObservation("session-1", {
      peerId: "491701111111@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      observedAt: "2026-02-09T09:00:00.000Z",
    });
    index.recordObservation("session-1", {
      peerId: "491709999999@s.whatsapp.net",
      peerType: "GROUP",
      threadId: "120363111111111@g.us",
      displayName: "Bob",
      observedAt: "2026-02-09T09:01:00.000Z",
    });

    const withoutGroups = index.listCandidates("session-1", {
      includeGroups: false,
      limit: 10,
    });

    expect(withoutGroups).toHaveLength(1);
    expect(withoutGroups[0].peerType).toBe("USER");
  });

  it("enforces max candidate count per session", () => {
    const index = new PersonalPeerCandidateIndex(2);

    index.recordObservation("session-1", {
      peerId: "peer-1@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      displayName: null,
      observedAt: "2026-02-09T09:00:00.000Z",
    });
    index.recordObservation("session-1", {
      peerId: "peer-2@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      displayName: null,
      observedAt: "2026-02-09T09:01:00.000Z",
    });
    index.recordObservation("session-1", {
      peerId: "peer-3@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      displayName: null,
      observedAt: "2026-02-09T09:02:00.000Z",
    });

    const result = index.listCandidates("session-1", { includeGroups: true, limit: 10 });
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.peerId)).toEqual([
      "peer-3@s.whatsapp.net",
      "peer-2@s.whatsapp.net",
    ]);
  });

  it("clears candidates for a session", () => {
    const index = new PersonalPeerCandidateIndex(5);

    index.recordObservation("session-1", {
      peerId: "peer-1@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      displayName: null,
      observedAt: "2026-02-09T09:00:00.000Z",
    });

    expect(index.listCandidates("session-1")).toHaveLength(1);
    index.clearSession("session-1");
    expect(index.listCandidates("session-1")).toEqual([]);
  });
});
