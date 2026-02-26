import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SessionCredentialStore } from "../../../../../src/infrastructure/adapters/whatsapp-personal/session-credential-store.js";

describe("session-credential-store", () => {
  it("persists and loads session metadata", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wa-session-store-"));

    try {
      const store = new SessionCredentialStore(root);
      await store.getSessionAuthPath("session-1");
      await store.markSessionMeta({
        sessionId: "session-1",
        accountLabel: "home",
        status: "PENDING_QR",
        createdAt: "2026-02-09T00:00:00.000Z",
        updatedAt: "2026-02-09T00:00:00.000Z",
      });

      const loaded = await store.loadSessionMeta("session-1");
      expect(loaded).toEqual({
        sessionId: "session-1",
        accountLabel: "home",
        status: "PENDING_QR",
        createdAt: "2026-02-09T00:00:00.000Z",
        updatedAt: "2026-02-09T00:00:00.000Z",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists and deletes sessions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wa-session-store-"));

    try {
      const store = new SessionCredentialStore(root);
      await store.markSessionMeta({
        sessionId: "session-1",
        accountLabel: "home",
        status: "ACTIVE",
        createdAt: "2026-02-09T00:00:00.000Z",
        updatedAt: "2026-02-09T00:00:01.000Z",
      });
      await store.markSessionMeta({
        sessionId: "session-2",
        accountLabel: "work",
        status: "DEGRADED",
        createdAt: "2026-02-09T00:00:00.000Z",
        updatedAt: "2026-02-09T00:00:02.000Z",
      });

      const listed = await store.listSessionMeta();
      expect(listed.map((item) => item.sessionId).sort()).toEqual(["session-1", "session-2"]);

      await store.deleteSession("session-1");
      expect(await store.loadSessionMeta("session-1")).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
