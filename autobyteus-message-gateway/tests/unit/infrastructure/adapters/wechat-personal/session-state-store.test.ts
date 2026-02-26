import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WechatSessionStateStore } from "../../../../../src/infrastructure/adapters/wechat-personal/session-state-store.js";

describe("WechatSessionStateStore", () => {
  it("saves, loads, lists, and deletes session metadata", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wechat-state-store-"));
    const store = new WechatSessionStateStore(root);

    await store.save({
      sessionId: "session-1",
      accountLabel: "Home",
      status: "ACTIVE",
      createdAt: "2026-02-09T10:00:00.000Z",
      updatedAt: "2026-02-09T10:01:00.000Z",
    });

    const loaded = await store.load("session-1");
    expect(loaded).toMatchObject({
      sessionId: "session-1",
      accountLabel: "Home",
      status: "ACTIVE",
    });

    const listed = await store.list();
    expect(listed).toHaveLength(1);

    await store.delete("session-1");
    expect(await store.load("session-1")).toBeNull();
  });
});
