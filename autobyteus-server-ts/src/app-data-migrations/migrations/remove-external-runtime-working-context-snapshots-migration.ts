import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { WORKING_CONTEXT_SNAPSHOT_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import {
  RuntimeMemoryLocationClassifier,
  type RuntimeMemoryLocation,
} from "../../agent-memory/services/runtime-memory-location-classifier.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { isExternalProviderRuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID } from "./team-agent-memory-layout-app-data-migration.js";

const MIGRATION_ID = "20260731_remove_external_runtime_working_context_snapshots";

const messageFromError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const itemIdFor = (memoryDir: string, filePath: string): string =>
  path.relative(memoryDir, filePath).split(path.sep).join("/") || ".";

const discoverSnapshots = async (
  rootDir: string,
  memoryDir: string,
  details: AppDataMigrationItemDetail[],
  output: Set<string>,
): Promise<void> => {
  let entries: Dirent[];
  try {
    const rootStat = await fs.lstat(rootDir);
    if (rootStat.isSymbolicLink()) return;
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) return;
    details.push({
      itemId: itemIdFor(memoryDir, rootDir),
      filePath: rootDir,
      status: "FAILED",
      message: `Could not inventory snapshots: ${messageFromError(error)}`,
    });
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (
      entry.name === WORKING_CONTEXT_SNAPSHOT_FILE_NAME
      && (entry.isFile() || entry.isSymbolicLink())
    ) {
      output.add(path.resolve(entryPath));
    } else if (entry.isDirectory()) {
      await discoverSnapshots(entryPath, memoryDir, details, output);
    } else if (entry.isSymbolicLink()) {
      details.push({
        itemId: itemIdFor(memoryDir, entryPath),
        filePath: entryPath,
        status: "SKIPPED",
        message: "Symbolic-link directory was not traversed.",
      });
    }
  }
};

export class RemoveExternalRuntimeWorkingContextSnapshotsMigration
  implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove external runtime WorkingContext snapshots";
  readonly description =
    "Removes duplicate Codex and Claude WorkingContext snapshots from exact metadata-classified local run locations.";
  readonly requiredOnStartup = true;
  readonly prerequisiteMigrationIds = [TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID] as const;

  private readonly layout: AgentMemoryLayout;
  private readonly classifier: RuntimeMemoryLocationClassifier;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.classifier = new RuntimeMemoryLocationClassifier(memoryDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const classification = await this.classifier.classify();
    const details: AppDataMigrationItemDetail[] = classification.diagnostics.map((diagnostic) => ({
      itemId: diagnostic.itemId,
      filePath: diagnostic.filePath,
      status: diagnostic.status,
      message: diagnostic.message,
    }));
    const snapshots = new Set<string>();
    await discoverSnapshots(this.layout.getStandaloneRootDirPath(), this.memoryDir, details, snapshots);
    await discoverSnapshots(this.layout.getTeamRootDirPath(), this.memoryDir, details, snapshots);
    classification.diagnostics.forEach((diagnostic) => {
      if (diagnostic.workingContextSnapshotPath) {
        snapshots.delete(diagnostic.workingContextSnapshotPath);
      }
    });

    for (const target of classification.locations) {
      const present = snapshots.delete(target.workingContextSnapshotPath);
      if (!target.runtimeKind || !isExternalProviderRuntimeKind(target.runtimeKind)) {
        if (present) {
          details.push({
            itemId: target.itemId,
            filePath: target.workingContextSnapshotPath,
            status: "SKIPPED",
            message: "Snapshot belongs to a native or unsupported runtime and was preserved.",
          });
        }
        continue;
      }
      details.push(await this.removeEligibleTarget(target, present));
    }

    for (const filePath of [...snapshots].sort()) {
      details.push({
        itemId: itemIdFor(this.memoryDir, filePath),
        filePath,
        status: "SKIPPED",
        message: "Snapshot has no exact current metadata-derived external runtime classification.",
      });
    }

    const summary = buildSummary(details);
    return {
      status: summary.failedCount > 0
        ? summary.migratedCount + summary.skippedCount > 0
          ? "SUCCEEDED_WITH_WARNINGS"
          : "FAILED"
        : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} snapshot cleanup item${summary.failedCount === 1 ? "" : "s"} failed; retry after addressing the reported paths.`
        : null,
    };
  }

  private async removeEligibleTarget(
    target: RuntimeMemoryLocation,
    observedPresent: boolean,
  ): Promise<AppDataMigrationItemDetail> {
    if (!observedPresent) {
      return {
        itemId: target.itemId,
        filePath: target.workingContextSnapshotPath,
        status: "SKIPPED",
        message: "Eligible external runtime snapshot was already absent.",
      };
    }
    try {
      await fs.unlink(target.workingContextSnapshotPath);
      return {
        itemId: target.itemId,
        filePath: target.workingContextSnapshotPath,
        status: "MIGRATED",
        message: "Removed duplicate external runtime WorkingContext snapshot.",
      };
    } catch (error) {
      return {
        itemId: target.itemId,
        filePath: target.workingContextSnapshotPath,
        status: isNotFound(error) ? "SKIPPED" : "FAILED",
        message: isNotFound(error)
          ? "Eligible external runtime snapshot was already absent."
          : `Could not remove snapshot: ${messageFromError(error)}`,
      };
    }
  }
}

export const REMOVE_EXTERNAL_RUNTIME_WORKING_CONTEXT_SNAPSHOTS_MIGRATION_ID = MIGRATION_ID;
