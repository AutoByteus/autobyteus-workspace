import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateNotificationStore } from "../../../src/update-notifications/stores/update-notification-store.js";
import type { UpdateNotificationRecord } from "../../../src/update-notifications/domain/update-notification.js";

const record: UpdateNotificationRecord = {
  kind: "AGENT_PACKAGE", sourceId: "github:acme/agents", latestRevision: "b".repeat(40), fromRevision: "a".repeat(40),
  foundAt: "2026-10-20T10:00:00.000Z", read: false, handledRevision: null, handledAt: null,
  outcome: null, outcomeReason: null, outcomeAt: null,
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
      ["foundAt", "fromRevision", "handledAt", "handledRevision", "kind", "latestRevision", "outcome", "outcomeAt",
        "outcomeReason", "read", "sourceId"]);
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

  it("keeps a valid outcome and reads an absent or unknown outcome as none (DS-008)", async () => {
    const failed: UpdateNotificationRecord = { ...record, outcome: "AUTO_FAILED", outcomeReason: "disk full", outcomeAt: "2026-10-20T10:05:00.000Z" };
    await store.write([failed]);
    expect(await store.read()).toEqual([failed]);
    const { outcome: _o, outcomeReason: _r, outcomeAt: _a, ...withoutOutcome } = failed;
    fs.writeFileSync(store.filePath, JSON.stringify([
      withoutOutcome,
      { ...failed, sourceId: "s2", outcome: "AUTO_EXPLODED" },
      { ...failed, sourceId: "s3", outcomeAt: null },
    ]));
    expect(await store.read()).toEqual([
      record,
      { ...record, sourceId: "s2" },
      { ...record, sourceId: "s3" },
    ]);
  });
});
