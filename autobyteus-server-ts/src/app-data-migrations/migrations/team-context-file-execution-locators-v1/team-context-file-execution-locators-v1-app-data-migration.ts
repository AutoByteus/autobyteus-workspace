import fs from "node:fs/promises";
import path from "node:path";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult } from "../../domain/app-data-migration-types.js";
import { getAtomicRunPackageFileCommitWriter, type AtomicRunPackageFileCommitWriter } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../team-run-execution-tree-v2-app-data-migration.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID } from "../agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID } from "../raw-trace-rotation-layout-migration.js";
import { RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID } from "../raw-trace-active-file-name-migration.js";
import { TeamContextFileLocatorTransition } from "./team-context-file-locator-transition.js";
import { packageKey } from "../../../run-history/services/root-run-package-current-validator.js";
import { closeUnavailableDependencies, isContextFileReferenceUnavailable } from "../../../context-files/services/context-file-current-reference-validator.js";
import { TeamContextFileTransitionJournal } from "./team-context-file-transition-journal.js";

export const TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID = "20260926_team_context_file_execution_locators_v1";
export class TeamContextFileExecutionLocatorsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID;
  readonly displayName = "Exact Team attachment execution locators";
  readonly description = "Converts typed Team attachment references to proven exact execution ownership before startup.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID, AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID,
    RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID, RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID];
  constructor(private readonly memoryDir: string, private readonly appDataDir: string, private readonly baseUrl: () => string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const backupPath = path.join(this.appDataDir, "app-data-migration-backups", this.id);
    const outcomes = new Map<string, { disposition: string; reason: string }>();
    const set = (key: string, disposition: string, reason: string) => outcomes.set(key, {disposition, reason});
    let migratedCount = 0;
    try {
      if (path.resolve(backupPath).startsWith(`${path.resolve(this.memoryDir)}${path.sep}`)) throw new Error("Migration backups must be outside live memory discovery.");
      const transition = new TeamContextFileLocatorTransition(this.memoryDir, this.baseUrl());
      await transition.discover();
      for (const item of transition.diagnostics) set(packageKey(item.rootSubjectKind, item.rootRunId),
        item.code === "FAILED_ATTEMPT" ? "FAILED_ATTEMPT" : item.code === "ROOT_RUN_PACKAGE_MISSING_TREE" ? "PRESERVED_MISSING_TREE" : "PRESERVED_INVALID_PACKAGE", item.reason);
      const journal = new TeamContextFileTransitionJournal(backupPath, this.writer);
      await journal.assertKnownGroups([...transition.groups.map((g) => g.current.directory), ...transition.diagnostics.map((d) => d.packagePath)]);
      for (const group of transition.groups) {
        try {
          await transition.collectSources(group);
          for (const source of group.sources) await transition.transform(source, await fs.readFile(source.filePath, "utf8"));
        } catch (error) {
          set(group.current.key, isContextFileReferenceUnavailable(error) ? "REFERENCE_UNAVAILABLE" : "FAILED_ATTEMPT", message(error));
          continue;
        }
        try { await journal.preflight(transition, group.sources, group.current.directory); }
        catch (error) { set(group.current.key, "FAILED_ATTEMPT", message(error)); }
      }
      const dependencies = new Map(transition.groups.map((g) => [g.current.key, g.dependencies]));
      const unavailable = new Set(outcomes.keys());
      closeUnavailableDependencies(dependencies, unavailable, (key, ref) => set(key, "DEPENDENCY_UNAVAILABLE", `Referenced package '${ref}' is unavailable.`));
      for (const group of transition.groups) {
        if (unavailable.has(group.current.key)) continue;
        try {
          const count = await journal.execute(transition, group.sources);
          if (count) migratedCount += 1;
          set(group.current.key, count ? "CONVERTED" : "ALREADY_CURRENT", "Current typed references validated.");
        } catch (error) { set(group.current.key, "FAILED_ATTEMPT", message(error)); }
      }
      if (![...outcomes.values()].some((item) => item.disposition === "FAILED_ATTEMPT")) {
        await journal.completeDispositions([
          ...transition.diagnostics.map((d) => d.packagePath),
          ...transition.groups.filter((g) => unavailable.has(g.current.key)).map((g) => g.current.directory),
        ]);
      }
    } catch (error) { set(this.id, "FAILED_ATTEMPT", message(error)); }
    const failedCount = [...outcomes.values()].filter((item) => item.disposition === "FAILED_ATTEMPT").length;
    const warnings = [...outcomes.values()].some((item) => !["CONVERTED", "ALREADY_CURRENT", "FAILED_ATTEMPT"].includes(item.disposition));
    const counts = new Map<string, number>();
    const samples = new Map<string, string[]>();
    for (const [key, item] of outcomes) {
      counts.set(item.disposition, (counts.get(item.disposition) ?? 0) + 1);
      const values = samples.get(item.disposition) ?? [];
      if (values.length < 5) values.push(`${key}: ${item.reason.slice(0, 300)}`);
      samples.set(item.disposition, values);
    }
    return {
      status: failedCount ? "FAILED" : warnings ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      errorMessage: failedCount ? `${failedCount} source-group attempt(s) failed; see bounded attempt diagnostics.` : null,
      summary: { scannedCount: outcomes.size, migratedCount, skippedCount: outcomes.size - migratedCount - failedCount, failedCount,
        details: [...counts].map(([disposition, count]) => ({ itemId: disposition,
          status: disposition === "FAILED_ATTEMPT" ? "FAILED" : disposition === "CONVERTED" ? "MIGRATED" : "SKIPPED",
          message: `${count} group(s). ${samples.get(disposition)!.join("; ")}`, backupPath })) },
    };
  }
}
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
