import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../domain/app-data-migration-types.js";
import {
  buildSummary,
  discoverRunCandidates,
} from "./raw-trace-rotation-layout-migration-files.js";
import { migrateRawTraceRun } from "./raw-trace-rotation-layout-migration-run.js";

const MIGRATION_ID = "20260617_raw_trace_rotation_layout";

export class RawTraceRotationLayoutMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Raw trace rotation layout migration";
  readonly description = "Migrates raw trace archive subdirectories to direct raw_traces_<index>.jsonl rotation files.";
  readonly requiredOnStartup = true;

  constructor(private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    for (const candidate of await discoverRunCandidates(this.memoryDir)) {
      details.push(await migrateRawTraceRun(candidate));
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
        ? `${summary.failedCount} raw trace run director${summary.failedCount === 1 ? "y" : "ies"} could not be migrated.`
        : null,
    };
  }
}

export const RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID = MIGRATION_ID;
