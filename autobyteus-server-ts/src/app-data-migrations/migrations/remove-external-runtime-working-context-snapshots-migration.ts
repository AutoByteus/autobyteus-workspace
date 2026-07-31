import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { WORKING_CONTEXT_SNAPSHOT_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunMetadataStore } from "../../run-history/store/team-run-metadata-store.js";
import {
  isExternalProviderRuntimeKind,
  runtimeKindFromString,
  type RuntimeKind,
} from "../../runtime-management/runtime-kind-enum.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260731_remove_external_runtime_working_context_snapshots";

type ClassifiedTarget = {
  filePath: string;
  itemId: string;
  runtimeKind: RuntimeKind | null;
};

const messageFromError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
};

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const itemIdFor = (memoryDir: string, filePath: string): string =>
  path.relative(memoryDir, filePath).split(path.sep).join("/") || ".";

const listDirectories = async (
  rootDir: string,
  memoryDir: string,
  details: AppDataMigrationItemDetail[],
): Promise<string[]> => {
  try {
    const rootStat = await fs.lstat(rootDir);
    if (rootStat.isSymbolicLink()) {
      details.push({
        itemId: itemIdFor(memoryDir, rootDir),
        filePath: rootDir,
        status: "SKIPPED",
        message: "Symbolic-link directory was not traversed.",
      });
      return [];
    }
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    if (isNotFound(error)) return [];
    details.push({
      itemId: itemIdFor(memoryDir, rootDir),
      filePath: rootDir,
      status: "FAILED",
      message: `Could not inspect memory root: ${messageFromError(error)}`,
    });
    return [];
  }
};

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
    if (entry.name === WORKING_CONTEXT_SNAPSHOT_FILE_NAME &&
        (entry.isFile() || entry.isSymbolicLink())) {
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

  private readonly layout: AgentMemoryLayout;
  private readonly runMetadataStore: AgentRunMetadataStore;
  private readonly teamMetadataStore: TeamRunMetadataStore;
  private readonly locationService: AgentMemoryLocationService;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.runMetadataStore = new AgentRunMetadataStore(memoryDir);
    this.teamMetadataStore = new TeamRunMetadataStore(memoryDir);
    this.locationService = new AgentMemoryLocationService({ memoryDir });
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const blockedPaths = new Set<string>();
    const targets = await this.classifyTargets(details, blockedPaths);
    const snapshots = new Set<string>();
    await discoverSnapshots(this.layout.getStandaloneRootDirPath(), this.memoryDir, details, snapshots);
    await discoverSnapshots(this.layout.getTeamRootDirPath(), this.memoryDir, details, snapshots);

    for (const target of [...targets.values()].sort((left, right) => left.itemId.localeCompare(right.itemId))) {
      if (blockedPaths.has(target.filePath)) continue;
      const present = snapshots.delete(target.filePath);
      if (!target.runtimeKind || !isExternalProviderRuntimeKind(target.runtimeKind)) {
        if (present) {
          details.push({
            itemId: target.itemId,
            filePath: target.filePath,
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

  private async classifyTargets(
    details: AppDataMigrationItemDetail[],
    blockedPaths: Set<string>,
  ): Promise<Map<string, ClassifiedTarget>> {
    const targets = new Map<string, ClassifiedTarget>();
    const standaloneIds = await listDirectories(
      this.layout.getStandaloneRootDirPath(),
      this.memoryDir,
      details,
    );
    for (const runId of standaloneIds) {
      const metadataPath = this.runMetadataStore.getMetadataPath(runId);
      try {
        const metadata = await this.runMetadataStore.readMetadata(runId);
        if (!metadata) {
          if (await pathExists(metadataPath)) {
            throw new Error("Metadata file exists but is not valid current run metadata.");
          }
          continue;
        }
        if (metadata.runId !== runId) {
          throw new Error(`Metadata runId '${metadata.runId}' does not match directory '${runId}'.`);
        }
        this.registerTarget(targets, blockedPaths, details, {
          filePath: path.resolve(
            this.layout.getStandaloneRunDirPath(runId),
            WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
          ),
          itemId: `agents/${runId}`,
          runtimeKind: runtimeKindFromString(metadata.runtimeKind),
        });
      } catch (error) {
        details.push({
          itemId: `agents/${runId}:metadata`,
          filePath: metadataPath,
          status: "FAILED",
          message: `Could not classify standalone run metadata: ${messageFromError(error)}`,
        });
      }
    }

    const teamIds = await listDirectories(
      this.layout.getTeamRootDirPath(),
      this.memoryDir,
      details,
    );
    for (const teamRunId of teamIds) {
      const metadataPath = this.teamMetadataStore.getMetadataPath(teamRunId);
      try {
        const metadata = await this.teamMetadataStore.readMetadata(teamRunId);
        if (!metadata) continue;
        if (metadata.teamRunId !== teamRunId) {
          throw new Error(`Metadata teamRunId '${metadata.teamRunId}' does not match directory '${teamRunId}'.`);
        }
        for (const location of this.locationService.listTeamMemberLocationsFromMetadata(metadata)) {
          this.registerTarget(targets, blockedPaths, details, {
            filePath: path.resolve(location.memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME),
            itemId: itemIdFor(this.memoryDir, location.memoryDir),
            runtimeKind: runtimeKindFromString(location.member.runtimeKind),
          });
        }
      } catch (error) {
        details.push({
          itemId: `agent_teams/${teamRunId}:metadata`,
          filePath: metadataPath,
          status: "FAILED",
          message: `Could not classify team run metadata: ${messageFromError(error)}`,
        });
      }
    }
    return targets;
  }

  private registerTarget(
    targets: Map<string, ClassifiedTarget>,
    blockedPaths: Set<string>,
    details: AppDataMigrationItemDetail[],
    target: ClassifiedTarget,
  ): void {
    const existing = targets.get(target.filePath);
    if (!existing) {
      targets.set(target.filePath, target);
      return;
    }
    targets.delete(target.filePath);
    blockedPaths.add(target.filePath);
    details.push({
      itemId: target.itemId,
      filePath: target.filePath,
      status: "FAILED",
      message: `Multiple metadata identities resolve to this memory location ('${existing.itemId}' and '${target.itemId}'); snapshot was preserved.`,
    });
  }

  private async removeEligibleTarget(
    target: ClassifiedTarget,
    observedPresent: boolean,
  ): Promise<AppDataMigrationItemDetail> {
    if (!observedPresent) {
      return {
        itemId: target.itemId,
        filePath: target.filePath,
        status: "SKIPPED",
        message: "Eligible external runtime snapshot was already absent.",
      };
    }
    try {
      await fs.unlink(target.filePath);
      return {
        itemId: target.itemId,
        filePath: target.filePath,
        status: "MIGRATED",
        message: "Removed duplicate external runtime WorkingContext snapshot.",
      };
    } catch (error) {
      return {
        itemId: target.itemId,
        filePath: target.filePath,
        status: isNotFound(error) ? "SKIPPED" : "FAILED",
        message: isNotFound(error)
          ? "Eligible external runtime snapshot was already absent."
          : `Could not remove snapshot: ${messageFromError(error)}`,
      };
    }
  }
}

export const REMOVE_EXTERNAL_RUNTIME_WORKING_CONTEXT_SNAPSHOTS_MIGRATION_ID = MIGRATION_ID;
