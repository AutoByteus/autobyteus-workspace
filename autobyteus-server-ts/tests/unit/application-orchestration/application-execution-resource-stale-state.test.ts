import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationExecutionResourceConfigurationStore } from "../../../src/application-orchestration/stores/application-execution-resource-configuration-store.js";

const applicationId = "bundle-app__pkg__brief-studio";

describe("application execution-resource configuration stale-state handling", () => {
  let tempRoot: string;
  let storageLifecycleService: ApplicationStorageLifecycleService;
  let platformStateStore: ApplicationPlatformStateStore;
  let configurationStore: ApplicationExecutionResourceConfigurationStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-aer-stale-state-"));
    storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: {
        getAppDataDir: () => tempRoot,
      },
      applicationBundleService: {
        getApplicationById: vi.fn(async (requestedApplicationId: string) => (
          requestedApplicationId === applicationId
            ? ({ id: applicationId, backend: { migrationsDirPath: null } } as never)
            : null
        )),
      } as never,
    });
    platformStateStore = new ApplicationPlatformStateStore({ storageLifecycleService });
    configurationStore = new ApplicationExecutionResourceConfigurationStore({ platformStateStore });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const withPlatformDb = async <T>(fn: (db: DatabaseSync) => T): Promise<T> => {
    await storageLifecycleService.ensurePlatformStatePrepared(applicationId);
    const layout = storageLifecycleService.getStorageLayout(applicationId);
    const db = new DatabaseSync(layout.platformDatabasePath);
    try {
      return fn(db);
    } finally {
      db.close();
    }
  };

  it("resets saved setup refs that still use old owner shape instead of converting them", async () => {
    await withPlatformDb((db) => {
      db.exec(`
        CREATE TABLE __autobyteus_resource_configurations (
          slot_key TEXT PRIMARY KEY,
          resource_ref_json TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      db.prepare(
        `INSERT INTO __autobyteus_resource_configurations (
           slot_key,
           resource_ref_json,
           updated_at
         ) VALUES (?, ?, ?)`,
      ).run(
        "draftingTeam",
        JSON.stringify({
          owner: "shared",
          kind: "AGENT_TEAM",
          definitionId: "shared-writing-team",
        }),
        "2026-05-08T10:00:00.000Z",
      );
    });

    await expect(configurationStore.getConfiguration(applicationId, "draftingTeam")).resolves.toBeNull();
    await expect(configurationStore.listConfigurations(applicationId)).resolves.toEqual([]);

    const remainingRows = await withPlatformDb((db) => db.prepare(
      `SELECT slot_key, resource_ref_json FROM __autobyteus_resource_configurations`,
    ).all());
    expect(remainingRows).toEqual([]);
  });

  it("preserves valid setup refs whose identity values equal old field names", async () => {
    await withPlatformDb((db) => {
      db.exec(`
        CREATE TABLE __autobyteus_resource_configurations (
          slot_key TEXT PRIMARY KEY,
          resource_ref_json TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      const insertConfiguration = db.prepare(
        `INSERT INTO __autobyteus_resource_configurations (
           slot_key,
           resource_ref_json,
           updated_at
         ) VALUES (?, ?, ?)`,
      );
      insertConfiguration.run(
        "bundleOwner",
        JSON.stringify({
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: "owner",
        }),
        "2026-05-08T10:05:00.000Z",
      );
      insertConfiguration.run(
        "sharedResourceRef",
        JSON.stringify({
          source: "shared",
          kind: "AGENT",
          definitionId: "resourceRef",
        }),
        "2026-05-08T10:06:00.000Z",
      );
    });

    await expect(configurationStore.getConfiguration(applicationId, "bundleOwner")).resolves.toMatchObject({
      slotKey: "bundleOwner",
      executionResourceRef: {
        source: "bundle",
        kind: "AGENT_TEAM",
        localId: "owner",
      },
    });
    await expect(configurationStore.getConfiguration(applicationId, "sharedResourceRef")).resolves.toMatchObject({
      slotKey: "sharedResourceRef",
      executionResourceRef: {
        source: "shared",
        kind: "AGENT",
        definitionId: "resourceRef",
      },
    });
    await expect(configurationStore.listConfigurations(applicationId)).resolves.toHaveLength(2);
  });
});
