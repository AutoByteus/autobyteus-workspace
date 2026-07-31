import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
  AppDataMigrationStatusSnapshot,
  AppDataMigrationSummary,
} from "./domain/app-data-migration-types.js";
import { AppDataMigrationDuplicateRunError } from "./domain/app-data-migration-types.js";
import {
  AppDataMigrationRegistry,
  getAppDataMigrationRegistry,
} from "./app-data-migration-registry.js";
import {
  AppDataMigrationRecordRepository,
  getAppDataMigrationRecordRepository,
} from "./repositories/app-data-migration-record-repository.js";

const DEFAULT_STALE_RUNNING_MS = 15 * 60 * 1000;

const emptySummary = (): AppDataMigrationSummary => ({
  scannedCount: 0,
  migratedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  details: [],
});

const parseSummary = (summaryJson: string | null): AppDataMigrationSummary | null => {
  if (!summaryJson) return null;
  try {
    const parsed = JSON.parse(summaryJson) as Partial<AppDataMigrationSummary>;
    return {
      scannedCount: Number(parsed.scannedCount ?? 0),
      migratedCount: Number(parsed.migratedCount ?? 0),
      skippedCount: Number(parsed.skippedCount ?? 0),
      failedCount: Number(parsed.failedCount ?? 0),
      details: Array.isArray(parsed.details) ? parsed.details as AppDataMigrationSummary["details"] : [],
    };
  } catch {
    return null;
  }
};

const canRetryStatus = (status: string): boolean =>
  status === "NOT_RUN" ||
  status === "FAILED" ||
  status === "SUCCEEDED_WITH_WARNINGS";

export class AppDataMigrationRunner {
  private readonly inFlight = new Map<string, Promise<AppDataMigrationRecordSnapshot>>();

  constructor(
    private readonly registry: AppDataMigrationRegistry = getAppDataMigrationRegistry(),
    private readonly repository: AppDataMigrationRecordRepositoryLike = getAppDataMigrationRecordRepository(),
    private readonly options: { staleRunningMs?: number; logsDir?: string } = {},
  ) {}

  async listStatuses(): Promise<AppDataMigrationStatusSnapshot[]> {
    const records = new Map(
      (await this.repository.listRecords()).map((record) => [record.migrationId, record]),
    );
    return this.registry.listDefinitions().map((definition) => {
      const record = records.get(definition.id);
      return this.toStatusSnapshot(definition, record ?? null);
    });
  }

  async runPending(): Promise<AppDataMigrationStatusSnapshot[]> {
    const results: AppDataMigrationStatusSnapshot[] = [];
    for (const definition of this.registry.listDefinitions()) {
      if (!definition.requiredOnStartup) {
        continue;
      }
      const record = await this.repository.getRecord(definition.id);
      if (record?.status === "SUCCEEDED" || record?.status === "SUCCEEDED_WITH_WARNINGS") {
        results.push(this.toStatusSnapshot(definition, record));
        continue;
      }
      try {
        const updated = await this.runDefinition(definition);
        results.push(this.toStatusSnapshot(definition, updated));
      } catch {
        const failedRecord = await this.repository.getRecord(definition.id);
        results.push(this.toStatusSnapshot(definition, failedRecord));
      }
    }
    return results;
  }

  async runMigration(migrationId: string): Promise<AppDataMigrationStatusSnapshot> {
    const definition = this.registry.getDefinition(migrationId);
    if (!definition) {
      throw new Error(`Unknown app data migration '${migrationId}'.`);
    }
    const record = await this.runDefinition(definition);
    return this.toStatusSnapshot(definition, record);
  }

  private async runDefinition(
    definition: AppDataMigrationDefinition,
  ): Promise<AppDataMigrationRecordSnapshot> {
    if (this.inFlight.has(definition.id)) {
      throw new AppDataMigrationDuplicateRunError(definition.id);
    }

    const runPromise = this.runDefinitionWithRecordLock(definition);
    this.inFlight.set(definition.id, runPromise);
    try {
      return await runPromise;
    } finally {
      this.inFlight.delete(definition.id);
    }
  }

  private async runDefinitionWithRecordLock(
    definition: AppDataMigrationDefinition,
  ): Promise<AppDataMigrationRecordSnapshot> {
    const existingRecord = await this.repository.getRecord(definition.id);
    if (this.isCurrentlyRunning(existingRecord)) {
      throw new AppDataMigrationDuplicateRunError(definition.id);
    }

    return this.executeDefinition(definition);
  }

  private isCurrentlyRunning(record: AppDataMigrationRecordSnapshot | null): boolean {
    if (record?.status !== "RUNNING") {
      return false;
    }
    if (!record.startedAt) {
      return false;
    }
    const staleMs = this.options.staleRunningMs ?? DEFAULT_STALE_RUNNING_MS;
    return Date.now() - record.startedAt.getTime() < staleMs;
  }

  private async executeDefinition(
    definition: AppDataMigrationDefinition,
  ): Promise<AppDataMigrationRecordSnapshot> {
    await this.repository.markRunning({
      migrationId: definition.id,
      displayName: definition.displayName,
      startedAt: new Date(),
    });

    try {
      const result = await definition.execute();
      const summaryJson = JSON.stringify(result.summary);
      const logPath = await this.writeLog(definition, result.summary, result.errorMessage ?? null);
      return await this.repository.complete({
        migrationId: definition.id,
        displayName: definition.displayName,
        status: result.status,
        completedAt: new Date(),
        summaryJson,
        errorMessage: result.errorMessage ?? null,
        logPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const summary = emptySummary();
      const logPath = await this.writeLog(definition, summary, message);
      return await this.repository.markFailed({
        migrationId: definition.id,
        displayName: definition.displayName,
        completedAt: new Date(),
        summaryJson: JSON.stringify(summary),
        errorMessage: message,
        logPath,
      });
    }
  }

  private toStatusSnapshot(
    definition: AppDataMigrationDefinition,
    record: AppDataMigrationRecordSnapshot | null,
  ): AppDataMigrationStatusSnapshot {
    const status = record?.status ?? "NOT_RUN";
    return {
      migrationId: definition.id,
      displayName: record?.displayName ?? definition.displayName,
      description: definition.description,
      requiredOnStartup: definition.requiredOnStartup,
      status,
      attempts: record?.attempts ?? 0,
      startedAt: record?.startedAt ?? null,
      completedAt: record?.completedAt ?? null,
      summaryJson: record?.summaryJson ?? null,
      summary: parseSummary(record?.summaryJson ?? null),
      errorMessage: record?.errorMessage ?? null,
      logPath: record?.logPath ?? null,
      canRetry: canRetryStatus(status),
    };
  }

  private async writeLog(
    definition: AppDataMigrationDefinition,
    summary: AppDataMigrationSummary,
    errorMessage: string | null,
  ): Promise<string | null> {
    const logsRoot = this.options.logsDir ?? path.join(appConfigProvider.config.getLogsDir(), "app-data-migrations");
    await fs.mkdir(logsRoot, { recursive: true });
    const filePath = path.join(
      logsRoot,
      `${definition.id}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`,
    );
    const lines = [
      `migrationId=${definition.id}`,
      `displayName=${definition.displayName}`,
      `statusSummary=${JSON.stringify({
        scannedCount: summary.scannedCount,
        migratedCount: summary.migratedCount,
        skippedCount: summary.skippedCount,
        failedCount: summary.failedCount,
      })}`,
      errorMessage ? `error=${errorMessage}` : "error=",
      "details=",
      ...summary.details.map((detail) => JSON.stringify(detail)),
      "",
    ];
    await fs.writeFile(filePath, lines.join("\n"), "utf-8");
    return filePath;
  }
}

let cachedAppDataMigrationRunner: AppDataMigrationRunner | null = null;

export const getAppDataMigrationRunner = (): AppDataMigrationRunner => {
  if (!cachedAppDataMigrationRunner) {
    cachedAppDataMigrationRunner = new AppDataMigrationRunner(
      getAppDataMigrationRegistry(),
      new AppDataMigrationRecordRepository(),
    );
  }
  return cachedAppDataMigrationRunner;
};
