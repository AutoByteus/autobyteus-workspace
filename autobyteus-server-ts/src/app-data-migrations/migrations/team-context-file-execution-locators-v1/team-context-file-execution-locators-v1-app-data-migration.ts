import fs from "node:fs/promises";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult } from "../../domain/app-data-migration-types.js";
import { getAtomicRunPackageFileCommitWriter, type AtomicRunPackageFileCommitWriter } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../team-run-execution-tree-v2-app-data-migration.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID } from "../agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID } from "../raw-trace-rotation-layout-migration.js";
import { RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID } from "../raw-trace-active-file-name-migration.js";
import { TeamContextFileLocatorTransition } from "./team-context-file-locator-transition.js";
import { packageKey } from "../../../run-history/services/root-run-package-current-validator.js";
import { isContextFileReferenceUnavailable } from "./context-file-current-locator-validator.js";

export const TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID = "20260926_team_context_file_execution_locators_v1";
export class TeamContextFileExecutionLocatorsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID;
  readonly displayName = "Exact Team attachment execution locators";
  readonly description = "Converts typed Team attachment references to proven exact execution ownership before startup.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID, AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID,
    RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID, RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID];
  constructor(private readonly memoryDir: string, private readonly baseUrl: () => string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    // Only counters and bounded samples survive each file; source/target text is file-local.
    const counts = new Map<string, number>();
    const samples = new Map<string, string[]>();
    const record = (key: string, disposition: string, reason: string) => {
      counts.set(disposition, (counts.get(disposition) ?? 0) + 1);
      const values = samples.get(disposition) ?? [];
      if (values.length < 5) values.push(`${key}: ${reason.slice(0, 300)}`);
      samples.set(disposition, values);
    };
    const failure = (key: string, error: unknown) => record(key,
      isContextFileReferenceUnavailable(error) ? "REFERENCE_UNAVAILABLE" : "FAILED_ATTEMPT", message(error));
    try {
      const transition = new TeamContextFileLocatorTransition(this.memoryDir, this.baseUrl());
      await transition.discover();
      for (const item of transition.diagnostics) record(packageKey(item.rootSubjectKind, item.rootRunId),
        item.code === "FAILED_ATTEMPT" ? "FAILED_ATTEMPT" : item.code === "ROOT_RUN_PACKAGE_MISSING_TREE" ? "PRESERVED_MISSING_TREE" : "PRESERVED_INVALID_PACKAGE", item.reason);
      for (const group of transition.groups) {
        try { await transition.collectSources(group); }
        catch (error) { failure(group.current.key, error); continue; }
        for (const source of group.sources) {
          try {
            await transition.assertContainedRegularFile(source.filePath);
            const original = await fs.readFile(source.filePath, "utf8");
            const target = await transition.transform(group, source, original);
            if (target === original) {
              record(source.filePath, "ALREADY_CURRENT", "No reference changes required.");
              continue;
            }
            const result = await this.writer.writeSerializedText({file: "context-record", filePath: source.filePath, text: target});
            if (result.outcome !== "committed") {
              record(source.filePath, "FAILED_ATTEMPT", `${result.outcome} at ${result.stage}: ${result.cause.message}`);
              continue;
            }
            record(source.filePath, "CONVERTED", "Typed references converted.");
          } catch (error) { failure(source.filePath, error); }
        }
      }
    } catch (error) { record(this.id, "FAILED_ATTEMPT", message(error)); }
    const failedCount = counts.get("FAILED_ATTEMPT") ?? 0;
    const migratedCount = counts.get("CONVERTED") ?? 0;
    const scannedCount = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const warnings = [...counts.keys()].some((value) => !["CONVERTED", "ALREADY_CURRENT", "FAILED_ATTEMPT"].includes(value));
    return {
      status: failedCount ? "FAILED" : warnings ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      errorMessage: failedCount ? `${failedCount} source attempt(s) failed; see bounded attempt diagnostics.` : null,
      summary: { scannedCount, migratedCount, skippedCount: scannedCount - migratedCount - failedCount, failedCount,
        details: [...counts].map(([disposition, count]) => ({ itemId: disposition,
          status: disposition === "FAILED_ATTEMPT" ? "FAILED" : disposition === "CONVERTED" ? "MIGRATED" : "SKIPPED",
          message: `${count} item(s). ${samples.get(disposition)!.join("; ")}` })) },
    };
  }
}
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
