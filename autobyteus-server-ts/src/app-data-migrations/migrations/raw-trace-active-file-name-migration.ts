import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../domain/app-data-migration-types.js";
import {
  buildSummary,
  discoverRawTraceActiveFileCandidates,
  migrateRawTraceActiveFileCandidate,
} from "./raw-trace-active-file-name-migration-files.js";

const MIGRATION_ID = "20260707_raw_trace_active_file_name";

export class RawTraceActiveFileNameMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Raw trace active file name migration";
  readonly description = "Renames active raw trace files from raw_traces.jsonl to raw_traces_active.jsonl.";
  readonly requiredOnStartup = true;

  constructor(private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    for (const candidate of await discoverRawTraceActiveFileCandidates(this.memoryDir)) {
      details.push(await migrateRawTraceActiveFileCandidate(candidate));
    }
    const summary = buildSummary(details);
    const status = summary.failedCount > 0
      ? summary.migratedCount + summary.skippedCount > 0
        ? "SUCCEEDED_WITH_WARNINGS"
        : "FAILED"
      : "SUCCEEDED";
    return {
      status,
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} active raw trace file${summary.failedCount === 1 ? "" : "s"} could not be renamed.`
        : null,
    };
  }
}

export const RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID = MIGRATION_ID;
