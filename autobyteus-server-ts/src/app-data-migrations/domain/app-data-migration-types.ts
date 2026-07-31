export type AppDataMigrationStatus =
  | "NOT_RUN"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "SUCCEEDED_WITH_WARNINGS";

export type AppDataMigrationItemStatus = "MIGRATED" | "SKIPPED" | "FAILED";

export interface AppDataMigrationItemDetail {
  itemId: string;
  filePath?: string | null;
  status: AppDataMigrationItemStatus;
  message: string;
  backupPath?: string | null;
}

export interface AppDataMigrationSummary {
  scannedCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  details: AppDataMigrationItemDetail[];
}

export interface AppDataMigrationExecutionResult {
  status: Exclude<AppDataMigrationStatus, "NOT_RUN" | "RUNNING">;
  summary: AppDataMigrationSummary;
  errorMessage?: string | null;
}

export interface AppDataMigrationDefinition {
  id: string;
  displayName: string;
  description: string;
  requiredOnStartup: boolean;
  execute(): Promise<AppDataMigrationExecutionResult>;
}

export interface AppDataMigrationRecordSnapshot {
  migrationId: string;
  displayName: string;
  status: AppDataMigrationStatus;
  attempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  summaryJson: string | null;
  errorMessage: string | null;
  logPath: string | null;
}

export interface AppDataMigrationStatusSnapshot extends AppDataMigrationRecordSnapshot {
  description: string;
  requiredOnStartup: boolean;
  canRetry: boolean;
  summary: AppDataMigrationSummary | null;
}

export interface AppDataMigrationRecordRepositoryLike {
  getRecord(migrationId: string): Promise<AppDataMigrationRecordSnapshot | null>;
  listRecords(): Promise<AppDataMigrationRecordSnapshot[]>;
  markRunning(input: {
    migrationId: string;
    displayName: string;
    startedAt: Date;
  }): Promise<AppDataMigrationRecordSnapshot>;
  complete(input: {
    migrationId: string;
    displayName: string;
    status: Exclude<AppDataMigrationStatus, "NOT_RUN" | "RUNNING">;
    completedAt: Date;
    summaryJson: string;
    errorMessage: string | null;
    logPath: string | null;
  }): Promise<AppDataMigrationRecordSnapshot>;
  markFailed(input: {
    migrationId: string;
    displayName: string;
    completedAt: Date;
    summaryJson: string;
    errorMessage: string;
    logPath: string | null;
  }): Promise<AppDataMigrationRecordSnapshot>;
}

export class AppDataMigrationDuplicateRunError extends Error {
  readonly code = "APP_DATA_MIGRATION_ALREADY_RUNNING";

  constructor(migrationId: string) {
    super(`App data migration '${migrationId}' is already running.`);
    this.name = "AppDataMigrationDuplicateRunError";
  }
}
