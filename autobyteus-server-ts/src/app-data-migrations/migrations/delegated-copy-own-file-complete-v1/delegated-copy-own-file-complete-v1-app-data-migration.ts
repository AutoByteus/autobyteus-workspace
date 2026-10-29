import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../frozen/server/agent-memory/store/agent-memory-layout.js";
import { getAgentOrgRunExecutionTreePath } from "../../frozen/server/run-history/store/agent-org-run-execution-tree-path.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
} from "../../frozen/server/run-history/store/atomic-run-package-file-commit-writer.js";
import { parseTaskAgentRunMetadata } from "../../frozen/server/run-history/store/task-agent-own-file-schema.js";
import { validateTaskAgentTeamTreePayload } from "../../frozen/server/run-history/store/task-agent-team-tree-schema.js";
import { getTeamRunExecutionTreePath } from "../../frozen/server/run-history/store/team-run-execution-tree-path.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationRecordRepositoryLike,
} from "../../domain/app-data-migration-types.js";
import {
  RELEASED_TASK_AGENT_RUN_METADATA_FILE,
  RELEASED_TASK_AGENT_TEAM_TREE_FILE,
  type ReleasedTaskAgentCoordinatingRun,
} from "../../frozen/released-run-package-shapes/released-task-agent-own-files-with-origin.js";
import {
  completeOwnFile,
  coordinatingRunOfRaw,
  isConfiguredPlaceCopy,
  type OwnFileKind,
  type RawCoordinatingTree,
} from "./own-file-completion.js";
const TASK_AGENT_OWN_RUN_V1_MIGRATION_ID = "20261017_task_agent_own_run_v1";

export const DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID = "20261019_delegated_copy_own_file_complete_v1";

type Disposition =
  | "MIGRATED"
  | "SKIPPED_ALREADY_CURRENT"
  | "PRESERVED_PLACEMENT_MISSING"
  | "PRESERVED_UNREADABLE"
  | "PRESERVED_UNSUPPORTED"
  | "FAILED_OPERATION";
type OwnFile = Readonly<{ kind: OwnFileKind; runId: string; filePath: string }>;

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const statusOf = (disposition: Disposition): AppDataMigrationItemDetail["status"] =>
  disposition === "MIGRATED" ? "MIGRATED" : disposition === "FAILED_OPERATION" ? "FAILED" : "SKIPPED";

const runFolders = async (root: string): Promise<string[]> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if (isMissing(error)) return [];
    throw error;
  });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
};

/**
 * `20261019_delegated_copy_own_file_complete_v1` (design DS-004, Migration Plan): every delegated copy's own
 * file restores on its own. A copy of a configured place gets its definition and launch (a Team copy: its
 * team facts, each member's complete launch and whether it follows the Team, and its members' handoff rules)
 * from its slot in the coordinating run as it is now; every Team copy's members record their complete launch
 * and `followsTeam`; `taskAgent.origin` is removed from every own file. One atomic write per file, read back
 * with the current reader. A copy whose slot is gone, or whose file cannot be read or converted, is left
 * unchanged and reported (it is not loaded). Startup only, registered last, no declared prerequisites: the
 * app always starts, and the result stays non-terminal while `20261017_task_agent_own_run_v1` has not
 * succeeded, so the own files it writes on a later start are converted then.
 */
export class DelegatedCopyOwnFileCompleteV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID;
  readonly displayName = "Delegated copies restore from their own file";
  readonly description = "Completes each delegated copy's own file so it restores on its own, and removes the obsolete origin field.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;

  private readonly layout: AgentMemoryLayout;

  constructor(
    memoryDir: string,
    private readonly dependencies: Readonly<{
      /** The migration ledger, read for predecessor statuses. */
      ledger: Pick<AppDataMigrationRecordRepositoryLike, "getRecord">;
      writer?: AtomicRunPackageFileCommitWriter;
    }>,
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const writer = this.dependencies.writer ?? getAtomicRunPackageFileCommitWriter();
    const trees = new Map<string, Promise<RawCoordinatingTree>>();
    const details: AppDataMigrationItemDetail[] = [];
    let scanned = 0;
    for (const file of await this.discover()) {
      let raw: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(await fs.readFile(file.filePath, "utf8"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("It is not a JSON object.");
        raw = parsed as Record<string, unknown>;
      } catch (error) {
        if (isMissing(error)) continue;
        scanned += 1;
        this.add(details, file, "PRESERVED_UNREADABLE", `It cannot be read: ${message(error)}`);
        continue;
      }
      // Only a delegated copy's own file carries a `taskAgent` section (standalone runs and Team runs do not). A Team
      // run's tree read here is kept for the copies of its slots (read once per run).
      if (!("taskAgent" in raw)) {
        if (file.kind === "team") trees.set(`agent_team:${file.runId}`, Promise.resolve({ kind: "present", raw }));
        continue;
      }
      scanned += 1;
      // Only a copy of a configured place reads its coordinating run's tree (QR-002).
      const coordinatingRun = isConfiguredPlaceCopy(raw) ? coordinatingRunOfRaw(raw) : null;
      const coordinatingTree = coordinatingRun ? await this.readCoordinatingTree(trees, coordinatingRun) : null;
      const completion = completeOwnFile({
        kind: file.kind,
        runId: file.runId,
        raw,
        coordinating: () => coordinatingTree ?? { kind: "unavailable", reason: "It names no coordinating run." },
      });
      switch (completion.kind) {
        case "already_current": this.add(details, file, "SKIPPED_ALREADY_CURRENT"); break;
        case "placement_missing": this.add(details, file, "PRESERVED_PLACEMENT_MISSING", completion.reason); break;
        case "unsupported": this.add(details, file, "PRESERVED_UNSUPPORTED", completion.reason); break;
        case "complete": {
          const failure = await this.write(writer, file, completion.payload);
          this.add(details, file, failure ? "FAILED_OPERATION" : "MIGRATED", failure ?? undefined);
          break;
        }
      }
    }
    return this.result(scanned, details, await this.predecessorPending());
  }

  /** Every own-file candidate under the memory root (never `imports/`): teams' and agents' run folders. */
  private async discover(): Promise<OwnFile[]> {
    const agentsRoot = this.layout.getStandaloneRootDirPath();
    const teamsRoot = this.layout.getTeamRootDirPath();
    return [
      ...(await runFolders(teamsRoot)).map((runId): OwnFile => ({
        kind: "team", runId, filePath: path.join(teamsRoot, runId, RELEASED_TASK_AGENT_TEAM_TREE_FILE),
      })),
      ...(await runFolders(agentsRoot)).map((runId): OwnFile => ({
        kind: "agent", runId, filePath: path.join(agentsRoot, runId, RELEASED_TASK_AGENT_RUN_METADATA_FILE),
      })),
    ];
  }

  /** A coordinating run's tree as raw JSON, read once per run for this attempt (several copies can share it). */
  private readCoordinatingTree(
    cache: Map<string, Promise<RawCoordinatingTree>>,
    run: ReleasedTaskAgentCoordinatingRun,
  ): Promise<RawCoordinatingTree> {
    const key = `${run.kind}:${run.runId}`;
    let read = cache.get(key);
    if (!read) {
      read = this.readRawTree(run);
      cache.set(key, read);
    }
    return read;
  }

  private async readRawTree(run: ReleasedTaskAgentCoordinatingRun): Promise<RawCoordinatingTree> {
    if (run.kind === "agent") return { kind: "unavailable", reason: `Agent run '${run.runId}' has no configured places.` };
    const treePath = run.kind === "agent_team"
      ? getTeamRunExecutionTreePath(this.layout.getTeamDirPath({ rootTeamRunId: run.runId, ancestorTeamRunIds: [] }))
      : getAgentOrgRunExecutionTreePath(this.layout.getOrgDirPath(run.runId));
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(treePath, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("It is not a JSON object.");
      return { kind: "present", raw: parsed as Record<string, unknown> };
    } catch (error) {
      return { kind: "unavailable", reason: isMissing(error)
        ? `Its coordinating ${run.kind} run '${run.runId}' has no tree.`
        : `Its coordinating ${run.kind} run '${run.runId}' cannot be read: ${message(error)}` };
    }
  }

  /** One atomic write, then a read-back with the current reader; the failure message, or null. */
  private async write(writer: AtomicRunPackageFileCommitWriter, file: OwnFile, payload: unknown): Promise<string | null> {
    const result = await writer.write({
      file: file.kind === "agent" ? "task_agent_run_metadata" : "task_agent_team_tree",
      filePath: file.filePath,
      payload,
    });
    if (result.outcome !== "committed") return `The write did not complete (${result.stage}): ${result.cause.message}`;
    try {
      const readBack: unknown = JSON.parse(await fs.readFile(file.filePath, "utf8"));
      if (file.kind === "agent") parseTaskAgentRunMetadata(readBack, file.runId);
      else validateTaskAgentTeamTreePayload(readBack, file.runId);
      return null;
    } catch (error) {
      return `The written file does not read back: ${message(error)}`;
    }
  }

  private async predecessorPending(): Promise<boolean> {
    const ledger = this.dependencies.ledger;
    const status = (await ledger.getRecord(TASK_AGENT_OWN_RUN_V1_MIGRATION_ID))?.status;
    return status !== "SUCCEEDED" && status !== "SUCCEEDED_WITH_WARNINGS";
  }

  private add(details: AppDataMigrationItemDetail[], file: OwnFile, disposition: Disposition, reason?: string): void {
    details.push({
      itemId: `${file.kind === "agent" ? "task_agent" : "task_agent_team"}:${file.runId}`,
      filePath: file.filePath,
      status: statusOf(disposition),
      message: reason ? `${disposition}: ${reason}` : disposition,
    });
    if (disposition.startsWith("PRESERVED")) {
      // DESIGN.md rule 7: the copy is left out, its file is kept, and the reason is logged by run.
      console.warn(`[${this.id}] delegated copy '${file.runId}' is left unchanged and is not loaded (${disposition}): ${reason}`);
    }
  }

  private result(scannedCount: number, details: AppDataMigrationItemDetail[], waiting: boolean): AppDataMigrationExecutionResult {
    const failedCount = details.filter((item) => item.status === "FAILED").length;
    const migratedCount = details.filter((item) => item.status === "MIGRATED").length;
    const skippedCount = details.length - failedCount - migratedCount;
    const preserved = details.some((item) => item.message.startsWith("PRESERVED"));
    const nonTerminal = failedCount > 0 || waiting;
    return {
      status: nonTerminal ? "FAILED" : preserved ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount, migratedCount, skippedCount, failedCount, details },
      errorMessage: !nonTerminal ? null : failedCount > 0
        ? `${failedCount} delegated copy own file(s) are not converted yet; the next start continues.`
        : `Waiting for ${TASK_AGENT_OWN_RUN_V1_MIGRATION_ID}; the next start continues.`,
    };
  }
}
