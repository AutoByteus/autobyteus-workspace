import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateNotificationStore } from "../../../src/update-notifications/stores/update-notification-store.js";
import type { UpdateNotificationRecord } from "../../../src/update-notifications/domain/update-notification.js";

const record: UpdateNotificationRecord = {
  kind: "AGENT_PACKAGE", sourceId: "github:acme/agents", latestRevision: "b".repeat(40), fromRevision: "a".repeat(40),
  foundAt: "2026-10-20T10:00:00.000Z", read: false, handledRevision: null, handledAt: null,
};

describe("UpdateNotificationStore (QR-005)", () => {
  let dir: string;
  let store: UpdateNotificationStore;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "update-notification-store-"));
    store = new UpdateNotificationStore(dir);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes the exact current key set under <app-data>/update-notifications/notifications.json and reads it back", async () => {
    await store.write([{ ...record, extra: "dropped" } as UpdateNotificationRecord]);
    expect(store.filePath).toBe(path.join(dir, "update-notifications", "notifications.json"));
    const raw = JSON.parse(fs.readFileSync(store.filePath, "utf8")) as Record<string, unknown>[];
    expect(Object.keys(raw[0]!).sort()).toEqual(
      ["foundAt", "fromRevision", "handledAt", "handledRevision", "kind", "latestRevision", "read", "sourceId"]);
    expect(await store.read()).toEqual([record]);
  });

  it("reads a missing file as empty", async () => {
    expect(await store.read()).toEqual([]);
  });

  it("reads a malformed file as empty with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fs.mkdirSync(path.dirname(store.filePath), { recursive: true });
    fs.writeFileSync(store.filePath, "{broken");
    expect(await store.read()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("UPDATE_NOTIFICATIONS_FILE_UNREADABLE"), expect.anything());
  });

  it("keeps valid rows, skips rows of an unknown kind or shape, and ignores unknown fields", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fs.mkdirSync(path.dirname(store.filePath), { recursive: true });
    fs.writeFileSync(store.filePath, JSON.stringify([
      { ...record, futureField: 1 },
      { ...record, kind: "APPLICATION_PACKAGE" },
      { ...record, sourceId: "" },
      { ...record, read: "yes" },
      "not a row",
    ]));
    expect(await store.read()).toEqual([record]);
  });
});
