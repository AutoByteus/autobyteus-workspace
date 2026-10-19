import { AgentOrgRunExecutionTreeStore } from "../../../run-history/store/agent-org-run-execution-tree-store.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
} from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import { TeamRunExecutionTreeStore } from "../../../run-history/store/team-run-execution-tree-store.js";
import { StandaloneRootPackageStore } from "../../../standalone-agent-run-root/persistence/standalone-root-package-store.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationRecordRepositoryLike,
} from "../../domain/app-data-migration-types.js";
import { getAppDataMigrationRecordRepository } from "../../repositories/app-data-migration-record-repository.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID } from "../agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID } from "../collaborators-to-delegated-runs-v1/collaborators-to-delegated-runs-v1-app-data-migration.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "../team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../team-run-execution-tree-v2-app-data-migration.js";
import { CoordinatingRunMigration, type TaskAgentDisposition } from "./coordinating-run-migration.js";
import {
  listCoordinatingTreeFiles,
  readReleasedCoordinatingTree,
  type PredecessorRole,
  type ReleasedCoordinatingTree,
} from "./released-coordinating-trees.js";

export const TASK_AGENT_OWN_RUN_V1_MIGRATION_ID = "20261017_task_agent_own_run_v1";

/**
 * Released migrations that write coordinating trees, by what they convert. A tree not in our input shape
 * waits while one that could still convert it has not succeeded (a retry may convert it); otherwise it is
 * preserved (contract §5.4).
 */
export const TREE_WRITING_PREDECESSOR_IDS: Readonly<Record<PredecessorRole, string>> = Object.freeze({
  team_tree_v1: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
  team_tree_v2: TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID,
  org_flat_families: AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID,
  collaborators: COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID,
});

type Disposition = TaskAgentDisposition | "WAITING_FOR_PREDECESSOR" | "PRESERVED_UNSUPPORTED_TREE";
const FAILED: ReadonlySet<Disposition> = new Set(["FAILED_OPERATION", "WAITING_FOR_PREDECESSOR"]);
const WARNINGS: ReadonlySet<Disposition> = new Set(["PRESERVED_UNSUPPORTED_TREE", "PRESERVED_UNREADABLE_LOG"]);
const statusOf = (disposition: Disposition): AppDataMigrationItemDetail["status"] =>
  FAILED.has(disposition) ? "FAILED" : disposition === "MIGRATED" ? "MIGRATED" : "SKIPPED";

/**
 * `20261017_task_agent_own_run_v1` (design D-8, contract §8): moves every task agent out of its
 * coordinating run into its own run folder (L1) with its own file, reduces the coordinating trees to
 * links, and gives each task agent its messages in its own log. Startup only, registered last, no declared
 * prerequisites: the app always starts; a non-terminal result is continued on the next start.
 */
export class TaskAgentOwnRunV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TASK_AGENT_OWN_RUN_V1_MIGRATION_ID;
  readonly displayName = "Task agents as their own runs";
  readonly description = "Moves each task agent's memory and facts into its own run folder and keeps a link in its coordinating run.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;

  constructor(
    private readonly memoryDir: string,
    private readonly dependencies: Readonly<{
      ledger?: Pick<AppDataMigrationRecordRepositoryLike, "getRecord">;
      writer?: AtomicRunPackageFileCommitWriter;
    }> = {},
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    let warning = false;
    let scanned = 0;
    let succeeded: ReadonlySet<string> | null = null;
    const add = (itemId: string, filePath: string, disposition: Disposition, message?: string) => {
      details.push({ itemId, filePath, status: statusOf(disposition), message: message ? `${disposition}: ${message}` : disposition });
      if (WARNINGS.has(disposition)) warning = true;
    };
    for (const file of await listCoordinatingTreeFiles(this.memoryDir)) {
      const read = await readReleasedCoordinatingTree(file);
      if (read.kind === "task_agent_team") continue;
      scanned += 1;
      const runItem = `${file.family}:${file.runId}`;
      if (read.kind === "not_input") {
        succeeded ??= await this.succeededPredecessors();
        const pending = read.convertibleBy.map((role) => TREE_WRITING_PREDECESSOR_IDS[role]).filter((id) => !succeeded!.has(id));
        add(runItem, file.treePath, pending.length > 0 ? "WAITING_FOR_PREDECESSOR" : "PRESERVED_UNSUPPORTED_TREE",
          pending.length > 0 ? `${read.reason} Waiting for ${pending.join(", ")}.` : read.reason);
        continue;
      }
      if (!read.tree.lists.some((list) => list.entries.length > 0)) continue;
      // One run's failure never stops the others (DESIGN.md rule 7); the next start continues it.
      try {
        const outcomes = await new CoordinatingRunMigration({
          memoryDir: this.memoryDir,
          tree: read.tree,
          writer: this.dependencies.writer ?? getAtomicRunPackageFileCommitWriter(),
          readBackWithCurrentStore: () => this.readBack(read.tree),
        }).run();
        for (const outcome of outcomes) {
          add(outcome.runId === file.runId ? runItem : `${runItem}/${outcome.runId}`, file.treePath, outcome.disposition, outcome.message);
        }
      } catch (error) {
        add(runItem, file.treePath, "FAILED_OPERATION", error instanceof Error ? error.message : String(error));
      }
    }
    return this.result(scanned, details, warning);
  }

  /** One ledger read per start, only when a tree is not in the input shape. */
  private async succeededPredecessors(): Promise<ReadonlySet<string>> {
    const ledger = this.dependencies.ledger ?? getAppDataMigrationRecordRepository();
    const done = new Set<string>();
    for (const id of Object.values(TREE_WRITING_PREDECESSOR_IDS)) {
      const status = (await ledger.getRecord(id))?.status;
      if (status === "SUCCEEDED" || status === "SUCCEEDED_WITH_WARNINGS") done.add(id);
    }
    return done;
  }

  private async readBack(tree: ReleasedCoordinatingTree): Promise<void> {
    const read = tree.family === "agent"
      ? await new StandaloneRootPackageStore().readTree(tree.dir, tree.runId)
      : tree.family === "agent_team"
        ? await new TeamRunExecutionTreeStore().read(tree.dir, tree.runId)
        : await new AgentOrgRunExecutionTreeStore().read(tree.dir, tree.runId);
    if (!read) throw new Error(`The reduced tree of ${tree.family} run '${tree.runId}' cannot be read back.`);
  }

  private result(scannedCount: number, details: AppDataMigrationItemDetail[], warning: boolean): AppDataMigrationExecutionResult {
    const failedCount = details.filter((item) => item.status === "FAILED").length;
    const migratedCount = details.filter((item) => item.status === "MIGRATED").length;
    return {
      status: failedCount > 0 ? "FAILED" : warning ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount, migratedCount, skippedCount: details.length - failedCount - migratedCount, failedCount, details },
      errorMessage: failedCount > 0
        ? `${failedCount} task agent item(s) are not migrated yet; the next start continues.`
        : null,
    };
  }
}
