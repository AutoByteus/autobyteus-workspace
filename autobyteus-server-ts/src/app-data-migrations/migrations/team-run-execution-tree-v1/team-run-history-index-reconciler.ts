import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree-v1-types.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { extractSummaryFromRawTraces } from "../../../run-history/services/run-history-service-helpers.js";
import { projectTeamRunHistoryIndexRow } from "./team-run-history-index-v1-row-projector.js";
import type { TeamRunIndexFileRecord, TeamRunIndexRowRecord } from "../../../run-history/store/team-run-history-index-record-types.js";
import { TeamRunHistoryIndexStore } from "../../../run-history/store/team-run-history-index-store.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./team-run-execution-tree-v1-constants.js";

export type TeamRunHistoryIndexReconciliationResult = Readonly<{
  kind: "APPLIED";
  changed: boolean;
  projectedCount: number;
  backupPath: string | null;
}> | Readonly<{
  kind: "WARNING";
  message: string;
}>;

type ReconcilerDependencies = Readonly<{
  indexStore?: TeamRunHistoryIndexStore;
  now?: () => Date;
}>;

const syncFile = async (filePath: string): Promise<void> => {
  const handle = await fs.open(filePath, "r");
  try { await handle.sync(); } finally { await handle.close(); }
};

const syncDirectory = async (directory: string): Promise<void> => {
  const handle = await fs.open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
};

const rowsEqual = (
  left: readonly Readonly<TeamRunIndexRowRecord>[],
  right: readonly Readonly<TeamRunIndexRowRecord>[],
): boolean => JSON.stringify(left) === JSON.stringify(right);

export class TeamRunHistoryIndexReconciler {
  private readonly indexStore: TeamRunHistoryIndexStore;
  private readonly layout: AgentMemoryLayout;
  private readonly now: () => Date;

  constructor(
    memoryDir: string,
    private readonly backupRoot: string,
    dependencies: ReconcilerDependencies = {},
  ) {
    this.indexStore = dependencies.indexStore ?? new TeamRunHistoryIndexStore(memoryDir);
    this.layout = new AgentMemoryLayout(memoryDir);
    this.now = dependencies.now ?? (() => new Date());
  }

  async reconcile(
    trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>,
  ): Promise<TeamRunHistoryIndexReconciliationResult> {
    try {
      return await this.reconcileStrict(trees);
    } catch (error) {
      return Object.freeze({
        kind: "WARNING" as const,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async reconcileStrict(
    trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>,
  ): Promise<TeamRunHistoryIndexReconciliationResult> {
    const snapshot = await this.indexStore.readIndexStrict();
    const existingRows = new Map(snapshot.rows.map((row) => [row.teamRunId, row]));
    const projected: TeamRunIndexFileRecord = [];

    for (const [rootTeamRunId, tree] of [...trees.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      if (tree.rootTeam.teamRunId !== rootTeamRunId) {
        throw new Error(`Validated TeamRun tree key '${rootTeamRunId}' does not match root '${tree.rootTeam.teamRunId}'.`);
      }
      const existingRow = existingRows.get(rootTeamRunId) ?? null;
      const recoveredSummary = existingRow?.summary
        ? null
        : await this.recoverCoordinatorSummary(tree);
      projected.push(projectTeamRunHistoryIndexRow({ tree, existingRow, recoveredSummary }));
    }

    projected.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt) || left.teamRunId.localeCompare(right.teamRunId));
    if (rowsEqual(projected, snapshot.rows)) {
      return Object.freeze({
        kind: "APPLIED" as const,
        changed: false,
        projectedCount: projected.length,
        backupPath: null,
      });
    }

    const backupPath = snapshot.sourceExists
      ? await this.backupExistingIndex(snapshot.sourcePath)
      : null;
    await this.indexStore.writeIndex(projected);
    const persisted = await this.indexStore.readIndexStrict();
    if (!rowsEqual(projected, persisted.rows)) {
      throw new Error("TeamRun history index validation did not match the admitted projection.");
    }
    return Object.freeze({
      kind: "APPLIED" as const,
      changed: true,
      projectedCount: projected.length,
      backupPath,
    });
  }

  private async recoverCoordinatorSummary(tree: TeamRunExecutionTreeSnapshot): Promise<string> {
    const coordinator = tree.rootTeam.members.find((member) =>
      "agentRunId" in member && member.address === tree.rootTeam.coordinatorAddress);
    if (!coordinator || !("agentRunId" in coordinator)) return "";
    const runDir = this.layout.getTeamAgentRunDirPath({
      rootTeamRunId: tree.rootTeam.teamRunId,
      ancestorTeamRunIds: [],
    }, coordinator.agentRunId);
    const tracePath = path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    try {
      const records = (await fs.readFile(tracePath, "utf8"))
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as unknown)
        .filter((value): value is Record<string, unknown> =>
          Boolean(value) && typeof value === "object" && !Array.isArray(value));
      return extractSummaryFromRawTraces(records, []);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`Unable to recover TeamRun summary for '${tree.rootTeam.teamRunId}': ${String(error)}`);
      }
      return "";
    }
  }

  private async backupExistingIndex(sourcePath: string): Promise<string> {
    const token = `${this.now().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
    const backupDir = path.join(this.backupRoot, "team-history-index", token);
    const backupPath = path.join(backupDir, "team_run_history_index.json");
    const manifestPath = path.join(backupDir, "manifest.json");
    await fs.mkdir(backupDir, { recursive: true });
    await fs.copyFile(sourcePath, backupPath);
    await syncFile(backupPath);
    await fs.writeFile(manifestPath, `${JSON.stringify({
      migrationId: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
      sourcePath,
      backedUpAt: this.now().toISOString(),
    }, null, 2)}\n`, "utf8");
    await syncFile(manifestPath);
    await syncDirectory(backupDir);
    return backupDir;
  }
}
