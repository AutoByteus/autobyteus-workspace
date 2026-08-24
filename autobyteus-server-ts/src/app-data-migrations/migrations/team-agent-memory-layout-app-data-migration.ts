import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { TeamRunPhysicalScope } from "../../agent-team-execution/domain/team-run-physical-scope.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationItemStatus,
} from "../domain/app-data-migration-types.js";
import { TeamRunMigrationStateClassifier } from "./team-run-migration-state-classifier.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";

export const TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID =
  "20260823_repair_team_agent_memory_layout";

type EntryState = "MISSING" | "DIRECTORY" | "UNSUPPORTED";
type Disposition =
  | "MIGRATED"
  | "SKIPPED_UNMATERIALIZED"
  | "SKIPPED_ALREADY_CURRENT"
  | "PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING"
  | "PRESERVED_SYNC_VISIBLE_RESIDUE_WARNING"
  | "FAILED_INVALID_TARGET"
  | "FAILED_UNSUPPORTED_SOURCE"
  | "FAILED_OPERATION";

type DispositionRecord = {
  count: number;
  examples: string[];
};

const WARNING_DISPOSITIONS = new Set<Disposition>([
  "PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING",
  "PRESERVED_SYNC_VISIBLE_RESIDUE_WARNING",
]);
const FAILED_DISPOSITIONS = new Set<Disposition>([
  "FAILED_INVALID_TARGET",
  "FAILED_UNSUPPORTED_SOURCE",
  "FAILED_OPERATION",
]);

const dispositionStatus = (disposition: Disposition): AppDataMigrationItemStatus => {
  if (disposition === "MIGRATED") return "MIGRATED";
  return FAILED_DISPOSITIONS.has(disposition) ? "FAILED" : "SKIPPED";
};

const dispositionMessage = (disposition: Disposition): string => {
  switch (disposition) {
    case "MIGRATED": return "Moved complete flat AgentRun directories to canonical TeamRun scopes.";
    case "SKIPPED_UNMATERIALIZED": return "No persisted AgentRun directory exists at either location.";
    case "SKIPPED_ALREADY_CURRENT": return "Canonical AgentRun directories were already current.";
    case "PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING":
      return "Preserved flat directories beside valid canonical targets; Memory Sync v1 may retain both physical paths.";
    case "PRESERVED_SYNC_VISIBLE_RESIDUE_WARNING":
      return "Preserved unsupported flat entries beside valid canonical targets; Memory Sync v1 may retain both physical paths.";
    case "FAILED_INVALID_TARGET": return "Canonical targets are unsupported entries and were not modified.";
    case "FAILED_UNSUPPORTED_SOURCE": return "Flat sources are unsupported entries and no canonical target exists.";
    case "FAILED_OPERATION": return "Canonical targets could not be established or validated during the normal move attempt.";
  }
};

const entryState = async (entryPath: string): Promise<EntryState> => {
  try {
    return (await fs.lstat(entryPath)).isDirectory() ? "DIRECTORY" : "UNSUPPORTED";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "MISSING";
    throw error;
  }
};

export class TeamAgentMemoryLayoutAppDataMigration
implements AppDataMigrationDefinition {
  readonly id = TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID;
  readonly displayName = "Repair Team Agent memory layout";
  readonly description =
    "Moves affected nested AgentRun memory directories into their canonical TeamRun physical scopes.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "ANYTIME" as const;
  readonly prerequisiteMigrationIds = [TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID] as const;

  private readonly layout: AgentMemoryLayout;
  private readonly classifier: TeamRunMigrationStateClassifier;
  private readonly dispositions = new Map<Disposition, DispositionRecord>();
  private scannedCount = 0;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.classifier = new TeamRunMigrationStateClassifier(memoryDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.dispositions.clear();
    this.scannedCount = 0;
    const states = await this.classifier.listAndClassifyRoots();
    for (const state of states) {
      if (state.kind !== "CURRENT_V1") continue;
      const index = state.package.index;
      for (const agent of index.listAgentExecutions()) {
        const scope = index.getTeamRunPhysicalScope(agent.containingTeamRunId);
        if (scope.ancestorTeamRunIds.length === 0) continue;
        this.scannedCount += 1;
        await this.migrateAgent(scope, agent.agentRunId);
      }
    }
    return this.result();
  }

  private async migrateAgent(
    scope: TeamRunPhysicalScope,
    agentRunId: string,
  ): Promise<void> {
    const sourcePath = this.layout.getTeamAgentRunDirPath({
      rootTeamRunId: scope.rootTeamRunId,
      ancestorTeamRunIds: [],
    }, agentRunId);
    const targetPath = this.layout.getTeamAgentRunDirPath(scope, agentRunId);
    try {
      const [source, target] = await Promise.all([
        entryState(sourcePath),
        entryState(targetPath),
      ]);
      if (target === "UNSUPPORTED") {
        this.record("FAILED_INVALID_TARGET", targetPath);
      } else if (source === "MISSING" && target === "MISSING") {
        this.record("SKIPPED_UNMATERIALIZED", targetPath);
      } else if (source === "MISSING") {
        this.record("SKIPPED_ALREADY_CURRENT", targetPath);
      } else if (source === "UNSUPPORTED" && target === "DIRECTORY") {
        this.record("PRESERVED_SYNC_VISIBLE_RESIDUE_WARNING", sourcePath);
      } else if (source === "UNSUPPORTED") {
        this.record("FAILED_UNSUPPORTED_SOURCE", sourcePath);
      } else if (target === "DIRECTORY") {
        this.record("PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING", sourcePath);
      } else {
        await this.moveAndValidate(sourcePath, targetPath);
      }
    } catch {
      this.record("FAILED_OPERATION", targetPath);
    }
  }

  private async moveAndValidate(sourcePath: string, targetPath: string): Promise<void> {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const recheckedTarget = await entryState(targetPath);
    if (recheckedTarget === "DIRECTORY") {
      this.record("PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING", sourcePath);
      return;
    }
    if (recheckedTarget === "UNSUPPORTED") {
      this.record("FAILED_INVALID_TARGET", targetPath);
      return;
    }
    await fs.rename(sourcePath, targetPath);
    const [sourceAfter, targetAfter] = await Promise.all([
      entryState(sourcePath),
      entryState(targetPath),
    ]);
    this.record(
      sourceAfter === "MISSING" && targetAfter === "DIRECTORY"
        ? "MIGRATED"
        : "FAILED_OPERATION",
      targetPath,
    );
  }

  private record(disposition: Disposition, examplePath: string): void {
    const current = this.dispositions.get(disposition) ?? { count: 0, examples: [] };
    current.count += 1;
    current.examples.push(this.relativePath(examplePath));
    current.examples.sort();
    current.examples.splice(5);
    this.dispositions.set(disposition, current);
  }

  private relativePath(filePath: string): string {
    return path.relative(this.memoryDir, filePath).split(path.sep).join("/") || ".";
  }

  private result(): AppDataMigrationExecutionResult {
    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: AppDataMigrationItemDetail[] = [];
    for (const [disposition, record] of [...this.dispositions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))) {
      const status = dispositionStatus(disposition);
      if (status === "MIGRATED") migratedCount += record.count;
      else if (status === "FAILED") failedCount += record.count;
      else skippedCount += record.count;
      details.push({
        itemId: disposition,
        status,
        message: `${dispositionMessage(disposition)} Count: ${record.count}.` +
          (record.examples.length > 0 ? ` Examples: ${record.examples.join(", ")}.` : ""),
      });
    }
    const hasWarnings = [...this.dispositions.keys()].some((value) =>
      WARNING_DISPOSITIONS.has(value));
    return {
      status: failedCount > 0
        ? "FAILED"
        : hasWarnings ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: {
        scannedCount: this.scannedCount,
        migratedCount,
        skippedCount,
        failedCount,
        details,
      },
      errorMessage: failedCount > 0
        ? `${failedCount} Team Agent memory location${failedCount === 1 ? "" : "s"} could not be established.`
        : null,
    };
  }
}
