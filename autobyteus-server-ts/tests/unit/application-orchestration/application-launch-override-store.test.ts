import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApplicationLaunchOverrideStore } from "../../../src/application-orchestration/stores/application-launch-override-store.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";

const APPLICATION_ID = "local-package::brief-studio";
const TABLE_NAME = "__autobyteus_resource_configurations";

describe("ApplicationLaunchOverrideStore SQLite mutation boundaries", () => {
  let tempRoot: string;
  let lifecycle: ApplicationStorageLifecycleService;
  let store: ApplicationLaunchOverrideStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-launch-overrides-"));
    lifecycle = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot },
      applicationBundleService: {
        getApplicationById: async (applicationId: string) => (
          applicationId === APPLICATION_ID ? { id: applicationId } : null
        ),
      } as never,
    });
    store = new ApplicationLaunchOverrideStore({
      platformStateStore: new ApplicationPlatformStateStore({
        appConfig: { getAppDataDir: () => tempRoot },
        storageLifecycleService: lifecycle,
      }),
    });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("does not create a database or table while reading an application with no saved state", async () => {
    const databasePath = lifecycle.getStorageLayout(APPLICATION_ID).platformDatabasePath;

    await expect(store.getOverride(APPLICATION_ID, "writer")).resolves.toBeNull();
    await expect(store.listOverrides(APPLICATION_ID)).resolves.toEqual([]);

    await expect(fs.stat(databasePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps an existing empty SQLite schema and bytes unchanged across get/list", async () => {
    const databasePath = lifecycle.getStorageLayout(APPLICATION_ID).platformDatabasePath;
    await fs.mkdir(path.dirname(databasePath), { recursive: true });
    new DatabaseSync(databasePath).close();
    const before = await fs.readFile(databasePath);

    await expect(store.getOverride(APPLICATION_ID, "writer")).resolves.toBeNull();
    await expect(store.listOverrides(APPLICATION_ID)).resolves.toEqual([]);

    const after = await fs.readFile(databasePath);
    expect(after).toEqual(before);
    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = db.prepare(
        `SELECT COUNT(*) AS tableCount FROM sqlite_master WHERE type = 'table'`,
      ).get() as { tableCount: number };
      expect(Number(row.tableCount)).toBe(0);
    } finally {
      db.close();
    }
  });

  it("hydrates current rows without changing bytes or updated_at", async () => {
    const databasePath = lifecycle.getStorageLayout(APPLICATION_ID).platformDatabasePath;
    await fs.mkdir(path.dirname(databasePath), { recursive: true });
    const db = new DatabaseSync(databasePath);
    db.exec(`
      CREATE TABLE ${TABLE_NAME} (
        slot_key TEXT PRIMARY KEY,
        resource_ref_json TEXT,
        launch_profile_json TEXT,
        launch_defaults_json TEXT,
        updated_at TEXT NOT NULL
      );
    `);
    db.prepare(
      `INSERT INTO ${TABLE_NAME} (
        slot_key, resource_ref_json, launch_profile_json, launch_defaults_json, updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      "writer",
      JSON.stringify({ kind: "AGENT", agentDefinitionId: "writer" }),
      JSON.stringify({ kind: "AGENT", llmModelIdentifier: "gpt-5.6-luna" }),
      null,
      "2026-08-22T12:00:00.000Z",
    );
    db.close();
    const before = await fs.readFile(databasePath);

    await expect(store.getOverride(APPLICATION_ID, "writer")).resolves.toMatchObject({
      slotKey: "writer",
      executionResourceRef: { state: "parsed" },
      launchOverride: { state: "parsed" },
      legacyLaunchDefaults: { state: "absent" },
      updatedAt: "2026-08-22T12:00:00.000Z",
    });
    await expect(store.listOverrides(APPLICATION_ID)).resolves.toHaveLength(1);

    expect(await fs.readFile(databasePath)).toEqual(before);
    const readOnlyDb = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = readOnlyDb.prepare(
        `SELECT updated_at FROM ${TABLE_NAME} WHERE slot_key = 'writer'`,
      ).get() as { updated_at: string };
      expect(row.updated_at).toBe("2026-08-22T12:00:00.000Z");
    } finally {
      readOnlyDb.close();
    }
  });

  it("creates current schema only on explicit save and deletes only on explicit Reset", async () => {
    await store.upsertOverride(APPLICATION_ID, {
      slotKey: "writer",
      executionResourceRef: null,
      launchOverride: {
        kind: "AGENT",
        llmModelIdentifier: "gpt-5.6-luna",
      },
      updatedAt: "2026-08-22T13:00:00.000Z",
    });

    await expect(store.listOverrides(APPLICATION_ID)).resolves.toHaveLength(1);
    await store.removeOverride(APPLICATION_ID, "writer");
    await expect(store.listOverrides(APPLICATION_ID)).resolves.toEqual([]);
  });
});
