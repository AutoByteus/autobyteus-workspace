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
import {
  AppDataMigrationDuplicateRunError,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";

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

const createDefinition = (
  id: string,
  execute: AppDataMigrationDefinition["execute"],
  prerequisiteMigrationIds: readonly string[] = [],
): AppDataMigrationDefinition => ({
  id,
  displayName: `Migration ${id}`,
  description: "test migration",
  requiredOnStartup: true,
  prerequisiteMigrationIds,
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

  it("keeps ordinary recent persisted RUNNING records protected by the timestamp guard", async () => {
    const execute = vi.fn(async () => ({ status: "SUCCEEDED" as const, summary }));
    const repository = new InMemoryMigrationRepository();
    repository.records.set("m1", {
      migrationId: "m1",
      displayName: "Migration m1",
      status: "RUNNING",
      attempts: 1,
      startedAt: new Date(),
      completedAt: null,
      summaryJson: null,
      errorMessage: null,
      logPath: null,
    });
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([createDefinition("m1", execute)]),
      repository,
      { logsDir: tempDir },
    );

    await expect(runner.runMigration("m1"))
      .rejects.toBeInstanceOf(AppDataMigrationDuplicateRunError);
    expect(execute).not.toHaveBeenCalled();
    expect((await repository.getRecord("m1"))?.attempts).toBe(1);
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

  it("attempts, persists, and returns every required result without an aggregate startup throw", async () => {
    const repository = new InMemoryMigrationRepository();
    const executions: string[] = [];
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("m-fail", async () => {
          executions.push("m-fail");
          return {
            status: "FAILED",
            summary: { ...summary, failedCount: 1 },
            errorMessage: "failed item",
          };
        }),
        createDefinition("m-success", async () => {
          executions.push("m-success");
          return { status: "SUCCEEDED", summary };
        }),
        createDefinition("m-throws", async () => {
          executions.push("m-throws");
          throw new Error("definition crashed");
        }),
      ]),
      repository,
      { logsDir: tempDir },
    );

    const results = await runner.runPending();

    expect(executions).toEqual(["m-fail", "m-success", "m-throws"]);
    expect(results.map(({ migrationId, status }) => ({ migrationId, status })))
      .toEqual([
        { migrationId: "m-fail", status: "FAILED" },
        { migrationId: "m-success", status: "SUCCEEDED" },
        { migrationId: "m-throws", status: "FAILED" },
      ]);
    expect((await repository.getRecord("m-fail"))?.errorMessage).toBe("failed item");
    expect((await repository.getRecord("m-success"))?.status).toBe("SUCCEEDED");
    expect((await repository.getRecord("m-throws"))?.errorMessage).toBe("definition crashed");
  });

  it("blocks a failed dependent before attempt creation and continues independent migrations", async () => {
    const repository = new InMemoryMigrationRepository();
    const dependent = vi.fn(async () => ({ status: "SUCCEEDED" as const, summary }));
    const independent = vi.fn(async () => ({ status: "SUCCEEDED" as const, summary }));
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("prerequisite", async () => ({
          status: "FAILED",
          summary: { ...summary, failedCount: 1 },
          errorMessage: "prerequisite failed",
        })),
        createDefinition("dependent", dependent, ["prerequisite"]),
        createDefinition("independent", independent),
      ]),
      repository,
      { logsDir: tempDir },
    );

    const results = await runner.runPending();

    expect(results).toMatchObject([
      { migrationId: "prerequisite", status: "FAILED", attempts: 1 },
      {
        migrationId: "dependent",
        status: "NOT_RUN",
        attempts: 0,
        errorMessage: expect.stringContaining("APP_DATA_MIGRATION_PREREQUISITE_INCOMPLETE"),
      },
      { migrationId: "independent", status: "SUCCEEDED", attempts: 1 },
    ]);
    expect(dependent).not.toHaveBeenCalled();
    expect(independent).toHaveBeenCalledOnce();
    expect(await repository.getRecord("dependent")).toBeNull();
  });

  it.each(["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"] as const)(
    "admits a dependent when its prerequisite is %s",
    async (status) => {
      const repository = new InMemoryMigrationRepository();
      repository.records.set("prerequisite", {
        migrationId: "prerequisite",
        displayName: "Migration prerequisite",
        status,
        attempts: 1,
        startedAt: new Date(),
        completedAt: new Date(),
        summaryJson: JSON.stringify(summary),
        errorMessage: null,
        logPath: null,
      });
      const dependent = vi.fn(async () => ({ status: "SUCCEEDED" as const, summary }));
      const runner = new AppDataMigrationRunner(
        new AppDataMigrationRegistry([
          createDefinition("prerequisite", async () => ({ status: "SUCCEEDED", summary })),
          createDefinition("dependent", dependent, ["prerequisite"]),
        ]),
        repository,
        { logsDir: tempDir },
      );

      await expect(runner.runMigration("dependent")).resolves.toMatchObject({
        status: "SUCCEEDED",
        attempts: 1,
      });
      expect(dependent).toHaveBeenCalledOnce();
    },
  );

  it.each(["FAILED", "RUNNING", "NOT_RUN"] as const)(
    "rejects manual dependent execution when its prerequisite is %s",
    async (status) => {
      const repository = new InMemoryMigrationRepository();
      if (status !== "NOT_RUN") {
        repository.records.set("prerequisite", {
          migrationId: "prerequisite",
          displayName: "Migration prerequisite",
          status,
          attempts: 1,
          startedAt: new Date(),
          completedAt: status === "RUNNING" ? null : new Date(),
          summaryJson: null,
          errorMessage: null,
          logPath: null,
        });
      }
      const dependent = vi.fn(async () => ({ status: "SUCCEEDED" as const, summary }));
      const runner = new AppDataMigrationRunner(
        new AppDataMigrationRegistry([
          createDefinition("prerequisite", async () => ({ status: "SUCCEEDED", summary })),
          createDefinition("dependent", dependent, ["prerequisite"]),
        ]),
        repository,
        { logsDir: tempDir },
      );

      await expect(runner.runMigration("dependent")).rejects.toMatchObject({
        name: "AppDataMigrationPrerequisiteError",
        migrationId: "dependent",
        incomplete: [{ migrationId: "prerequisite", status }],
      });
      expect(dependent).not.toHaveBeenCalled();
      expect(await repository.getRecord("dependent")).toBeNull();
    },
  );

  it("rejects invalid prerequisite topology at registry construction", () => {
    expect(() => new AppDataMigrationRegistry([
      createDefinition("dependent", async () => ({ status: "SUCCEEDED", summary }), ["later"]),
      createDefinition("later", async () => ({ status: "SUCCEEDED", summary })),
    ])).toThrow("must be registered earlier");
    expect(() => new AppDataMigrationRegistry([
      createDefinition("one", async () => ({ status: "SUCCEEDED", summary })),
      createDefinition("one", async () => ({ status: "SUCCEEDED", summary })),
    ])).toThrow("Duplicate app data migration ID");
    expect(() => new AppDataMigrationRegistry([
      createDefinition("one", async () => ({ status: "SUCCEEDED", summary })),
      createDefinition("two", async () => ({ status: "SUCCEEDED", summary }), ["one", "one"]),
    ])).toThrow("repeats prerequisite");
  });

  it("accepts persisted SUCCEEDED and SUCCEEDED_WITH_WARNINGS results without rerunning them", async () => {
    const repository = new InMemoryMigrationRepository();
    const executeSucceeded = vi.fn();
    const executeWarnings = vi.fn();
    for (const [migrationId, status] of [
      ["m-success", "SUCCEEDED"],
      ["m-warning", "SUCCEEDED_WITH_WARNINGS"],
    ] as const) {
      repository.records.set(migrationId, {
        migrationId,
        displayName: `Migration ${migrationId}`,
        status,
        attempts: 1,
        startedAt: new Date(),
        completedAt: new Date(),
        summaryJson: JSON.stringify(summary),
        errorMessage: null,
        logPath: null,
      });
    }
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        createDefinition("m-success", executeSucceeded),
        createDefinition("m-warning", executeWarnings),
      ]),
      repository,
      { logsDir: tempDir },
    );

    await expect(runner.runPending()).resolves.toMatchObject([
      { migrationId: "m-success", status: "SUCCEEDED" },
      { migrationId: "m-warning", status: "SUCCEEDED_WITH_WARNINGS" },
    ]);
    expect(executeSucceeded).not.toHaveBeenCalled();
    expect(executeWarnings).not.toHaveBeenCalled();
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
