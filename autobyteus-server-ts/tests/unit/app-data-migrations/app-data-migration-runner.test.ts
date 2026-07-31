import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { AppDataMigrationDuplicateRunError } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";

class InMemoryMigrationRepository implements AppDataMigrationRecordRepositoryLike {
  records = new Map<string, AppDataMigrationRecordSnapshot>();

  async getRecord(migrationId: string) {
    return this.records.get(migrationId) ?? null;
  }

  async listRecords() {
    return Array.from(this.records.values());
  }

  async markRunning(input: { migrationId: string; displayName: string; startedAt: Date }) {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = {
      migrationId: input.migrationId,
      displayName: input.displayName,
      status: "RUNNING",
      attempts: (previous?.attempts ?? 0) + 1,
      startedAt: input.startedAt,
      completedAt: null,
      summaryJson: null,
      errorMessage: null,
      logPath: null,
    };
    this.records.set(input.migrationId, record);
    return record;
  }

  async complete(input: {
    migrationId: string;
    displayName: string;
    status: "SUCCEEDED" | "FAILED" | "SUCCEEDED_WITH_WARNINGS";
    completedAt: Date;
    summaryJson: string;
    errorMessage: string | null;
    logPath: string | null;
  }) {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = {
      migrationId: input.migrationId,
      displayName: input.displayName,
      status: input.status,
      attempts: previous?.attempts ?? 1,
      startedAt: previous?.startedAt ?? null,
      completedAt: input.completedAt,
      summaryJson: input.summaryJson,
      errorMessage: input.errorMessage,
      logPath: input.logPath,
    };
    this.records.set(input.migrationId, record);
    return record;
  }

  async markFailed(input: {
    migrationId: string;
    displayName: string;
    completedAt: Date;
    summaryJson: string;
    errorMessage: string;
    logPath: string | null;
  }) {
    return this.complete({ ...input, status: "FAILED" });
  }
}

const createDefinition = (id: string, execute: AppDataMigrationDefinition["execute"]): AppDataMigrationDefinition => ({
  id,
  displayName: `Migration ${id}`,
  description: "test migration",
  requiredOnStartup: true,
  execute,
});

let tempDir: string;

const summary = {
  scannedCount: 0,
  migratedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  details: [],
};

describe("AppDataMigrationRunner", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-migration-runner-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("rejects true duplicate concurrent retry attempts", async () => {
    let release!: () => void;
    let markStarted!: () => void;
    const blocking = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const repository = new InMemoryMigrationRepository();
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("m1", async () => {
          markStarted();
          await blocking;
          return { status: "SUCCEEDED", summary };
        }),
      ]),
      repository,
      { logsDir: tempDir },
    );

    const first = runner.runMigration("m1");
    await started;
    await expect(runner.runMigration("m1")).rejects.toBeInstanceOf(AppDataMigrationDuplicateRunError);
    release();
    await expect(first).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect((await repository.getRecord("m1"))?.attempts).toBe(1);
  });

  it("treats stale RUNNING records as retryable", async () => {
    const repository = new InMemoryMigrationRepository();
    repository.records.set("m1", {
      migrationId: "m1",
      displayName: "Migration m1",
      status: "RUNNING",
      attempts: 1,
      startedAt: new Date(Date.now() - 10_000),
      completedAt: null,
      summaryJson: null,
      errorMessage: null,
      logPath: null,
    });
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("m1", async () => ({ status: "SUCCEEDED", summary })),
      ]),
      repository,
      { staleRunningMs: 1, logsDir: tempDir },
    );

    const result = await runner.runMigration("m1");

    expect(result.status).toBe("SUCCEEDED");
    expect(result.attempts).toBe(2);
  });

  it("lists registered migrations that do not have DB records", async () => {
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("m1", async () => ({ status: "SUCCEEDED", summary })),
      ]),
      new InMemoryMigrationRepository(),
      { logsDir: tempDir },
    );

    await expect(runner.listStatuses()).resolves.toMatchObject([
      { migrationId: "m1", status: "NOT_RUN", attempts: 0, canRetry: true },
    ]);
  });

  it("continues later required startup migrations after a failed migration result", async () => {
    const repository = new InMemoryMigrationRepository();
    const laterExecute = vi.fn(async () => ({ status: "SUCCEEDED" as const, summary }));
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("cleanup-failed", async () => ({
          status: "FAILED",
          summary: { ...summary, failedCount: 1 },
          errorMessage: "eligible snapshot unlink failed",
        })),
        createDefinition("later-startup-work", laterExecute),
      ]),
      repository,
      { logsDir: tempDir },
    );

    const statuses = await runner.runPending();

    expect(statuses).toMatchObject([
      { migrationId: "cleanup-failed", status: "FAILED", canRetry: true },
      { migrationId: "later-startup-work", status: "SUCCEEDED", canRetry: false },
    ]);
    expect(laterExecute).toHaveBeenCalledTimes(1);
  });

  it("exposes warning results for manual retry and records a successful retry attempt", async () => {
    let attempt = 0;
    const repository = new InMemoryMigrationRepository();
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("cleanup-warning", async () => {
          attempt += 1;
          return attempt === 1
            ? {
                status: "SUCCEEDED_WITH_WARNINGS",
                summary: { ...summary, migratedCount: 1, failedCount: 1 },
                errorMessage: "one retained file requires retry",
              }
            : { status: "SUCCEEDED", summary: { ...summary, migratedCount: 1 } };
        }),
      ]),
      repository,
      { logsDir: tempDir },
    );

    await expect(runner.runPending()).resolves.toMatchObject([
      { migrationId: "cleanup-warning", status: "SUCCEEDED_WITH_WARNINGS", canRetry: true, attempts: 1 },
    ]);
    await expect(runner.runMigration("cleanup-warning")).resolves.toMatchObject({
      migrationId: "cleanup-warning",
      status: "SUCCEEDED",
      canRetry: false,
      attempts: 2,
    });
  });

});
