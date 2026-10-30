import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationStatus,
} from "../../domain/app-data-migration-types.js";
import { discoverRunFolders, migrateManifest } from "./raw-trace-manifest-runtime-names-files.js";

const MIGRATION_ID = "20261030_raw_trace_manifest_runtime_names";
/** Named by id: a migration folder never imports another one. */
const RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID = "20260617_raw_trace_rotation_layout";
const RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID = "20260707_raw_trace_active_file_name";

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;

/**
 * Stored names follow the code: the runtime of each archived segment in `raw_traces_manifest.json` is the
 * `RuntimeKind` value, not an older short label. Converts the manifests of this node's own runs (agents, team
 * members, Org members) once at startup. A manifest it cannot use is kept as it is and reported; only an error while
 * walking, or a write that fails after validation, fails the migration (a restart retries it).
 * Memory Sync imports and the label copies inside old trace records are not touched.
 */
export class RawTraceManifestRuntimeNamesMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Raw trace manifest runtime names";
  readonly description = "Writes the RuntimeKind value instead of an older short label as the runtime of each archived raw-trace segment.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [
    RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID,
    RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID,
  ] as const;

  constructor(private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    let scanned = 0;
    let migrated = 0;
    let excluded = 0;
    let failed = 0;
    let current = 0;
    try {
      for (const runDir of await discoverRunFolders(this.memoryDir)) {
        const outcome = await migrateManifest(this.memoryDir, runDir);
        if (outcome.kind === "absent") continue;
        scanned += 1;
        if (outcome.kind === "current") {
          current += 1;
          continue;
        }
        details.push(outcome.detail);
        if (outcome.kind === "converted") migrated += 1;
        else if (outcome.kind === "excluded") excluded += 1;
        else failed += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "FAILED",
        summary: { scannedCount: scanned, migratedCount: migrated, skippedCount: excluded + current, failedCount: failed + 1, details },
        errorMessage: `Stopped while looking for raw trace manifests: ${message}`,
      };
    }
    const status: AppDataMigrationStatus = failed > 0 ? "FAILED" : excluded > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED";
    return {
      status: status as AppDataMigrationExecutionResult["status"],
      summary: { scannedCount: scanned, migratedCount: migrated, skippedCount: excluded + current, failedCount: failed, details },
      errorMessage: failed > 0 ? `${plural(failed, "raw trace manifest")} could not be converted; a restart tries again.` : null,
    };
  }
}

export const RAW_TRACE_MANIFEST_RUNTIME_NAMES_MIGRATION_ID = MIGRATION_ID;
