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
  executionPolicy?: "ANYTIME" | "STARTUP_ONLY";
  prerequisiteMigrationIds?: readonly string[];
  execute(): Promise<AppDataMigrationExecutionResult>;
}

export class AppDataMigrationRestartRequiredError extends Error {
  readonly code = "APP_DATA_MIGRATION_RESTART_REQUIRED";

  constructor(readonly migrationId: string) {
    super(`App data migration '${migrationId}' can run only during startup. Restart the application to retry it safely.`);
    this.name = "AppDataMigrationRestartRequiredError";
  }
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

export type AppDataMigrationPrerequisiteStatus = Readonly<{
  migrationId: string;
  status: AppDataMigrationStatus;
}>;

export class AppDataMigrationPrerequisiteError extends Error {
  readonly code = "APP_DATA_MIGRATION_PREREQUISITE_INCOMPLETE";

  constructor(
    readonly migrationId: string,
    readonly incomplete: readonly AppDataMigrationPrerequisiteStatus[],
  ) {
    super(`App data migration '${migrationId}' has incomplete prerequisites.`);
    this.name = "AppDataMigrationPrerequisiteError";
  }

  toJSON(): {
    code: string;
    migrationId: string;
    prerequisites: readonly AppDataMigrationPrerequisiteStatus[];
  } {
    return {
      code: this.code,
      migrationId: this.migrationId,
      prerequisites: this.incomplete,
    };
  }
}
