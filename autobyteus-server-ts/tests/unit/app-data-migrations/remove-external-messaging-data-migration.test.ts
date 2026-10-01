import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDataMigrationDefinition } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  REMOVE_EXTERNAL_MESSAGING_DATA_MIGRATION_ID,
  RemoveExternalMessagingDataMigration,
  type ExternalMessagingDataRoots,
} from "../../../src/app-data-migrations/migrations/remove-external-messaging-data-migration.js";

let tempDir: string;
let appDataDir: string;
let downloadDir: string;
let logsDir: string;
let roots: ExternalMessagingDataRoots;

const exists = async (target: string): Promise<boolean> => {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
};

const writeText = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const populateAllRoots = async (): Promise<void> => {
  await writeText(path.join(roots.bindingDataDir, "bindings.json"), "{\"bindings\":[]}");
  await writeText(path.join(roots.gatewayInstallDir, "config", "provider-config.json"), "{\"token\":\"secret\"}");
  await writeText(path.join(roots.gatewayInstallDir, "versions", "1.4.0", "index.js"), "runtime");
  await writeText(path.join(roots.gatewayDownloadDir, "gateway-1.4.0.tgz"), "archive");
  await writeText(path.join(roots.gatewayLogsDir, "gateway.log"), "log");
};

describe("RemoveExternalMessagingDataMigration", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "remove-external-messaging-data-"));
    appDataDir = path.join(tempDir, "app-data");
    downloadDir = path.join(appDataDir, "download");
    logsDir = path.join(appDataDir, "logs");
    roots = {
      bindingDataDir: path.join(appDataDir, "external-channel"),
      gatewayInstallDir: path.join(appDataDir, "extensions", "messaging-gateway"),
      gatewayDownloadDir: path.join(downloadDir, "messaging-gateway"),
      gatewayLogsDir: path.join(logsDir, "messaging-gateway"),
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("is a startup migration without prerequisites", () => {
    const migration: AppDataMigrationDefinition = new RemoveExternalMessagingDataMigration(roots);

    expect(migration.id).toBe(REMOVE_EXTERNAL_MESSAGING_DATA_MIGRATION_ID);
    expect(migration.id).toBe("20260924_remove_external_messaging_data");
    expect(migration.requiredOnStartup).toBe(true);
    expect(migration.executionPolicy).toBeUndefined();
    expect(migration.prerequisiteMigrationIds).toBeUndefined();
  });

  it("deletes all four roots and succeeds", async () => {
    await populateAllRoots();

    const result = await new RemoveExternalMessagingDataMigration(roots).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.errorMessage).toBeNull();
    expect(result.summary).toMatchObject({ scannedCount: 4, migratedCount: 4, skippedCount: 0, failedCount: 0 });
    for (const root of Object.values(roots)) {
      expect(await exists(root)).toBe(false);
    }
  });

  it("skips missing roots and succeeds", async () => {
    await writeText(path.join(roots.gatewayLogsDir, "gateway.log"), "log");

    const result = await new RemoveExternalMessagingDataMigration(roots).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: 4, migratedCount: 1, skippedCount: 3, failedCount: 0 });
    expect(result.summary.details.find((detail) => detail.itemId === "gatewayLogsDir")?.status).toBe("MIGRATED");
    expect(await exists(roots.gatewayLogsDir)).toBe(false);
  });

  it("leaves sibling folders and files next to the roots untouched", async () => {
    await populateAllRoots();
    const voiceInputExtension = path.join(appDataDir, "extensions", "voice-input", "model.bin");
    const otherDownload = path.join(downloadDir, "other-download.bin");
    const serverLog = path.join(logsDir, "server.log");
    const otherAppData = path.join(appDataDir, "memory", "agents", "run-1", "raw_traces.jsonl");
    for (const filePath of [voiceInputExtension, otherDownload, serverLog, otherAppData]) {
      await writeText(filePath, "keep");
    }

    const result = await new RemoveExternalMessagingDataMigration(roots).execute();

    expect(result.status).toBe("SUCCEEDED");
    for (const filePath of [voiceInputExtension, otherDownload, serverLog, otherAppData]) {
      expect(await fs.readFile(filePath, "utf-8")).toBe("keep");
    }
    expect(await exists(path.join(appDataDir, "extensions"))).toBe(true);
  });

  it("records a failed item without throwing and reports FAILED so the cleanup retries", async () => {
    await populateAllRoots();
    const actualRm = fs.rm.bind(fs);
    vi.spyOn(fs, "rm").mockImplementation(async (target, options) => {
      if (String(target) === roots.gatewayInstallDir) {
        throw Object.assign(new Error("EBUSY: resource busy or locked"), { code: "EBUSY" });
      }
      return actualRm(target, options);
    });

    const result = await new RemoveExternalMessagingDataMigration(roots).execute();

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("1 external messaging data root could not be removed");
    expect(result.summary).toMatchObject({ scannedCount: 4, migratedCount: 3, skippedCount: 0, failedCount: 1 });
    const failed = result.summary.details.find((detail) => detail.status === "FAILED");
    expect(failed).toMatchObject({ itemId: "gatewayInstallDir", filePath: roots.gatewayInstallDir });
    expect(failed?.message).toContain("EBUSY");
    expect(await exists(roots.gatewayInstallDir)).toBe(true);
    expect(await exists(roots.bindingDataDir)).toBe(false);
  });

  it("records an inspection failure without throwing", async () => {
    await populateAllRoots();
    const actualLstat = fs.lstat.bind(fs);
    vi.spyOn(fs, "lstat").mockImplementation((async (target: Parameters<typeof fs.lstat>[0]) => {
      if (String(target) === roots.bindingDataDir) {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      }
      return actualLstat(target);
    }) as typeof fs.lstat);

    const result = await new RemoveExternalMessagingDataMigration(roots).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary).toMatchObject({ migratedCount: 3, failedCount: 1 });
    expect(result.summary.details.find((detail) => detail.itemId === "bindingDataDir")?.message).toContain("EACCES");
  });

  it("removes a symlinked root without touching the link target", async () => {
    const outsideTarget = path.join(tempDir, "outside", "gateway-install");
    await writeText(path.join(outsideTarget, "keep.txt"), "keep");
    await fs.mkdir(path.dirname(roots.gatewayInstallDir), { recursive: true });
    await fs.symlink(outsideTarget, roots.gatewayInstallDir, "dir");

    const result = await new RemoveExternalMessagingDataMigration(roots).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.details.find((detail) => detail.itemId === "gatewayInstallDir")?.status).toBe("MIGRATED");
    expect(await exists(roots.gatewayInstallDir)).toBe(false);
    expect(await fs.readFile(path.join(outsideTarget, "keep.txt"), "utf-8")).toBe("keep");
  });

  it("succeeds on a retry after a previous failure", async () => {
    await populateAllRoots();
    const actualRm = fs.rm.bind(fs);
    const rm = vi.spyOn(fs, "rm").mockImplementationOnce(async () => {
      throw new Error("transient");
    });
    const migration = new RemoveExternalMessagingDataMigration(roots);
    expect((await migration.execute()).status).toBe("FAILED");

    rm.mockImplementation(async (target, options) => actualRm(target, options));
    const retry = await migration.execute();

    expect(retry.status).toBe("SUCCEEDED");
    expect(retry.summary).toMatchObject({ migratedCount: 1, skippedCount: 3, failedCount: 0 });
    for (const root of Object.values(roots)) {
      expect(await exists(root)).toBe(false);
    }
  });
});
