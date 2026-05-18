import { PrismaClient } from "@prisma/client";
import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
  AppDataMigrationStatus,
} from "../domain/app-data-migration-types.js";

const prisma = new PrismaClient();

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

const queryRecordById = async (migrationId: string): Promise<AppDataMigrationRecordSnapshot | null> => {
  const rows = await prisma.$queryRawUnsafe<RawMigrationRecord[]>(
    `SELECT migration_id, display_name, status, attempts, started_at, completed_at, summary_json, error_message, log_path
       FROM app_data_migration_records
      WHERE migration_id = ?
      LIMIT 1`,
    migrationId,
  );
  return rows[0] ? toRecord(rows[0]) : null;
};

export class AppDataMigrationRecordRepository implements AppDataMigrationRecordRepositoryLike {
  async getRecord(migrationId: string): Promise<AppDataMigrationRecordSnapshot | null> {
    return queryRecordById(migrationId);
  }

  async listRecords(): Promise<AppDataMigrationRecordSnapshot[]> {
    const rows = await prisma.$queryRawUnsafe<RawMigrationRecord[]>(
      `SELECT migration_id, display_name, status, attempts, started_at, completed_at, summary_json, error_message, log_path
         FROM app_data_migration_records
        ORDER BY migration_id ASC`,
    );
    return rows.map(toRecord);
  }

  async markRunning(input: {
    migrationId: string;
    displayName: string;
    startedAt: Date;
  }): Promise<AppDataMigrationRecordSnapshot> {
    await prisma.$executeRawUnsafe(
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
    const record = await queryRecordById(input.migrationId);
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
    await prisma.$executeRawUnsafe(
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
    const record = await queryRecordById(input.migrationId);
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
