import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
  AppDataMigrationStatus,
} from "../domain/app-data-migration-types.js";
import { boundedMigrationRecordSelect } from "./app-data-migration-summary-projection.js";

type RawMigrationRecord = {
  migration_id: string;
  display_name: string;
  status: string;
  attempts: number;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  summary_json: string | null;
  error_message: string | null;
  log_path: string | null;
};

const toDate = (value: Date | string | null): Date | null => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

const toRecord = (row: RawMigrationRecord): AppDataMigrationRecordSnapshot => ({
  migrationId: row.migration_id,
  displayName: row.display_name,
  status: row.status as AppDataMigrationStatus,
  attempts: Number(row.attempts ?? 0),
  startedAt: toDate(row.started_at),
  completedAt: toDate(row.completed_at),
  summaryJson: row.summary_json ?? null,
  errorMessage: row.error_message ?? null,
  logPath: row.log_path ?? null,
});

export class AppDataMigrationRecordRepository implements AppDataMigrationRecordRepositoryLike {
  private prisma: PrismaClient | null;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? null;
  }

  private get client(): PrismaClient {
    this.prisma ??= createConfiguredPrismaClient();
    return this.prisma;
  }

  private async queryRecordById(migrationId: string): Promise<AppDataMigrationRecordSnapshot | null> {
    const rows = await this.client.$queryRawUnsafe<RawMigrationRecord[]>(
      `${boundedMigrationRecordSelect("WHERE migration_id = ?")}
        LIMIT 1`,
      migrationId,
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async getRecord(migrationId: string): Promise<AppDataMigrationRecordSnapshot | null> {
    return this.queryRecordById(migrationId);
  }

  async listRecords(): Promise<AppDataMigrationRecordSnapshot[]> {
    const rows = await this.client.$queryRawUnsafe<RawMigrationRecord[]>(
      `${boundedMigrationRecordSelect()}
        ORDER BY migration_id ASC`,
    );
    return rows.map(toRecord);
  }

  async markRunning(input: {
    migrationId: string;
    displayName: string;
    startedAt: Date;
  }): Promise<AppDataMigrationRecordSnapshot> {
    await this.client.$executeRawUnsafe(
      `INSERT INTO app_data_migration_records
         (migration_id, display_name, status, attempts, started_at, completed_at, summary_json, error_message, log_path, updated_at)
       VALUES (?, ?, 'RUNNING', 1, ?, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT(migration_id) DO UPDATE SET
         display_name = excluded.display_name,
         status = 'RUNNING',
         attempts = attempts + 1,
         started_at = excluded.started_at,
         completed_at = NULL,
         error_message = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      input.migrationId,
      input.displayName,
      input.startedAt,
    );
    const record = await this.queryRecordById(input.migrationId);
    if (!record) {
      throw new Error(`App data migration record '${input.migrationId}' was not persisted.`);
    }
    return record;
  }

  async complete(input: {
    migrationId: string;
    displayName: string;
    status: Exclude<AppDataMigrationStatus, "NOT_RUN" | "RUNNING">;
    completedAt: Date;
    summaryJson: string;
    errorMessage: string | null;
    logPath: string | null;
  }): Promise<AppDataMigrationRecordSnapshot> {
    await this.client.$executeRawUnsafe(
      `UPDATE app_data_migration_records
          SET display_name = ?, status = ?, completed_at = ?, summary_json = ?, error_message = ?, log_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE migration_id = ?`,
      input.displayName,
      input.status,
      input.completedAt,
      input.summaryJson,
      input.errorMessage,
      input.logPath,
      input.migrationId,
    );
    const record = await this.queryRecordById(input.migrationId);
    if (!record) {
      throw new Error(`App data migration record '${input.migrationId}' was not found after completion.`);
    }
    return record;
  }

  async markFailed(input: {
    migrationId: string;
    displayName: string;
    completedAt: Date;
    summaryJson: string;
    errorMessage: string;
    logPath: string | null;
  }): Promise<AppDataMigrationRecordSnapshot> {
    return this.complete({
      migrationId: input.migrationId,
      displayName: input.displayName,
      status: "FAILED",
      completedAt: input.completedAt,
      summaryJson: input.summaryJson,
      errorMessage: input.errorMessage,
      logPath: input.logPath,
    });
  }
}

let cachedAppDataMigrationRecordRepository: AppDataMigrationRecordRepository | null = null;

export const getAppDataMigrationRecordRepository = (): AppDataMigrationRecordRepository => {
  if (!cachedAppDataMigrationRecordRepository) {
    cachedAppDataMigrationRecordRepository = new AppDataMigrationRecordRepository();
  }
  return cachedAppDataMigrationRecordRepository;
};
