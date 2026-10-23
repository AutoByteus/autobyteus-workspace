import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../frozen/server/agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
} from "../../frozen/server/run-history/store/atomic-run-package-file-commit-writer.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationRecordRepositoryLike,
} from "../../domain/app-data-migration-types.js";
import {
  AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME,
  STANDALONE_ROOT_MESSAGES_FILE_NAME,
  TEAM_COMMUNICATION_MESSAGES_FILE_NAME,
} from "../../frozen/released-run-package-shapes/released-message-logs-before-append-only.js";
import { readReleasedCoordinatingTree, TREE_FILE_NAMES, type CoordinatingFamily } from "../../frozen/task-agent-own-run-v1/released-coordinating-trees.js";
import { convertJsonMessageLog, UnreadableJsonMessageLogError, type JsonMessageLog } from "./message-log-conversion.js";
const AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID = "20260901_agent_org_flat_team_families_v1";
const TASK_AGENT_OWN_RUN_V1_MIGRATION_ID = "20261017_task_agent_own_run_v1";
const TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID = "20260701_team_communication_projection_addresses";
const TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID = "20260926_team_context_file_execution_locators_v1";
const TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID = "20260814_team_run_execution_tree_v1";

export const APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID = "20261018_append_only_message_logs_v1";

/** Released migrations that may still write a message log in a released format (design Migration Plan). */
export const LOG_WRITING_PREDECESSOR_IDS: readonly string[] = Object.freeze([
  TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
  TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID,
  AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID,
  TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID,
  TASK_AGENT_OWN_RUN_V1_MIGRATION_ID,
]);

type Disposition = "MIGRATED" | "WAITING_FOR_PREDECESSOR" | "PRESERVED_UNSUPPORTED" | "PRESERVED_UNREADABLE" | "FAILED";
const statusOf = (disposition: Disposition): AppDataMigrationItemDetail["status"] =>
  disposition === "MIGRATED" ? "MIGRATED" : disposition.startsWith("PRESERVED") ? "SKIPPED" : "FAILED";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const exists = (filePath: string): Promise<boolean> =>
  fs.access(filePath).then(() => true, (error: unknown) => { if (isMissing(error)) return false; throw error; });

/**
 * Team authorities an org folder still holds after an interrupted flat-families cutover (its
 * partial-target state, SR-005): flat-families retries it and reads the org's JSON log, so the log waits.
 */
const RETIRED_TEAM_AUTHORITIES = Object.freeze(["team_run_execution_tree.json", TEAM_COMMUNICATION_MESSAGES_FILE_NAME, "task_delegation_records.json"]);

const runFolders = async (root: string): Promise<string[]> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if (isMissing(error)) return [];
    throw error;
  });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
};

/**
 * `20261018_append_only_message_logs_v1` (design DS-005): converts every JSON message log (hubs, team
 * runs, organization runs, task agents, task agent teams) to the append-only layout and removes the JSON
 * file once the conversion reads back equal. A coordinating run's log is converted only when its tree is
 * in the shape the current runtime reads (own-run's `input`); a log that is not ready, or whose JSON
 * cannot be read, waits while any log-writing predecessor is still pending and is preserved (JSON kept,
 * warning) once all of them have succeeded. Startup only, registered last, no declared prerequisites:
 * the app always starts, and the result stays non-terminal while a log-writing predecessor is pending,
 * so JSON that a retried predecessor writes again is merged on the same start.
 */
export class AppendOnlyMessageLogsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID;
  readonly displayName = "Append-only message logs";
  readonly description = "Converts each run's message log from one JSON file into append-only JSON Lines files.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;

  constructor(
    private readonly memoryDir: string,
    private readonly dependencies: Readonly<{
      /** The migration ledger, read for predecessor statuses. */
      ledger: Pick<AppDataMigrationRecordRepositoryLike, "getRecord">;
      writer?: AtomicRunPackageFileCommitWriter;
    }>,
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const pending = await this.pendingPredecessors();
    const writer = this.dependencies.writer ?? getAtomicRunPackageFileCommitWriter();
    const details: AppDataMigrationItemDetail[] = [];
    const logs = await this.discover();
    for (const log of logs) {
      const disposition = await this.convert(log, pending, writer);
      const kind = disposition.kindOfLog;
      details.push({ itemId: `${kind}:${log.runId}`, filePath: log.jsonPath, status: statusOf(disposition.kind),
        message: disposition.reason ? `${disposition.kind}: ${disposition.reason}` : disposition.kind });
      if (disposition.kind.startsWith("PRESERVED")) {
        console.warn(`[${this.id}] ${kind} run '${log.runId}': message log kept as JSON (${disposition.kind}): ${disposition.reason}`);
      }
    }
    const failedCount = details.filter((item) => item.status === "FAILED").length;
    const migratedCount = details.filter((item) => item.status === "MIGRATED").length;
    const skippedCount = details.length - failedCount - migratedCount;
    const nonTerminal = failedCount > 0 || pending.length > 0;
    return {
      status: nonTerminal ? "FAILED" : skippedCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount: logs.length, migratedCount, skippedCount, failedCount, details },
      errorMessage: !nonTerminal ? null : failedCount > 0
        ? `${failedCount} message log(s) are not converted yet; the next start continues.`
        : `Waiting for ${pending.join(", ")}; the next start continues.`,
    };
  }

  /** One ledger read per start. */
  private async pendingPredecessors(): Promise<string[]> {
    const ledger = this.dependencies.ledger;
    const pending: string[] = [];
    for (const id of LOG_WRITING_PREDECESSOR_IDS) {
      const status = (await ledger.getRecord(id))?.status;
      if (status !== "SUCCEEDED" && status !== "SUCCEEDED_WITH_WARNINGS") pending.push(id);
    }
    return pending;
  }

  /** Every JSON message log under the memory root (never `imports/`), by kind. */
  private async discover(): Promise<JsonMessageLog[]> {
    const layout = new AgentMemoryLayout(this.memoryDir);
    const logs: JsonMessageLog[] = [];
    const add = async (entry: Omit<JsonMessageLog, "jsonPath">, fileName: string) => {
      const jsonPath = path.join(entry.dir, fileName);
      if (await exists(jsonPath)) logs.push({ ...entry, jsonPath });
    };
    for (const runId of await runFolders(layout.getStandaloneRootDirPath())) {
      await add({ kind: "agent", runId, dir: layout.getAgentRunCollaborationDirPath(runId), baseName: "communication_messages" }, STANDALONE_ROOT_MESSAGES_FILE_NAME);
      await add({ kind: "task_agent", runId, dir: path.join(layout.getStandaloneRootDirPath(), runId), baseName: "communication_messages" }, STANDALONE_ROOT_MESSAGES_FILE_NAME);
    }
    for (const runId of await runFolders(layout.getTeamRootDirPath())) {
      await add({ kind: "agent_team", runId, dir: path.join(layout.getTeamRootDirPath(), runId), baseName: "team_communication_messages" }, TEAM_COMMUNICATION_MESSAGES_FILE_NAME);
    }
    for (const runId of await runFolders(layout.getOrgRootDirPath())) {
      await add({ kind: "agent_org", runId, dir: path.join(layout.getOrgRootDirPath(), runId), baseName: "agent_org_communication_messages" }, AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME);
    }
    return logs;
  }

  private async convert(
    found: JsonMessageLog,
    pending: readonly string[],
    writer: AtomicRunPackageFileCommitWriter,
  ): Promise<Readonly<{ kind: Disposition; reason?: string; kindOfLog: JsonMessageLog["kind"] }>> {
    let log = found;
    const waitOr = (preserved: "PRESERVED_UNSUPPORTED" | "PRESERVED_UNREADABLE", reason: string) => pending.length > 0
      ? { kind: "WAITING_FOR_PREDECESSOR" as const, reason: `${reason} Waiting for ${pending.join(", ")}.`, kindOfLog: log.kind }
      : { kind: preserved, reason, kindOfLog: log.kind };
    try {
      if (log.kind !== "task_agent") {
        const gate = await this.gate(log);
        if (gate.kind === "task_agent_team") log = { ...log, kind: "task_agent_team" };
        else if (gate.kind === "not_ready") return waitOr("PRESERVED_UNSUPPORTED", gate.reason);
      }
      await convertJsonMessageLog(log, writer);
      return { kind: "MIGRATED", kindOfLog: log.kind };
    } catch (error) {
      if (error instanceof UnreadableJsonMessageLogError) return waitOr("PRESERVED_UNREADABLE", `The JSON log cannot be read: ${error.message}`);
      return { kind: "FAILED", reason: message(error), kindOfLog: log.kind };
    }
  }

  /**
   * A coordinating log is ready when its run's tree exists and reads as own-run `input`, and (an org) its
   * folder holds no retired team authority. A team folder whose tree carries `taskAgent` is a task agent
   * team: its own log, not gated.
   */
  private async gate(log: JsonMessageLog): Promise<Readonly<{ kind: "ready" | "task_agent_team" }> | Readonly<{ kind: "not_ready"; reason: string }>> {
    const family = log.kind as CoordinatingFamily;
    const treePath = path.join(log.dir, TREE_FILE_NAMES[family]);
    if (!await exists(treePath)) return { kind: "not_ready", reason: "The run has no tree file." };
    const read = await readReleasedCoordinatingTree({ family, runId: log.runId, dir: log.dir, treePath });
    if (read.kind === "not_input") return { kind: "not_ready", reason: `The run's tree is not in the current shape: ${read.reason}` };
    if (family === "agent_org") {
      const retired = (await Promise.all(RETIRED_TEAM_AUTHORITIES.map(async (name) => await exists(path.join(log.dir, name)) ? name : null)))
        .filter((name): name is string => name !== null);
      if (retired.length > 0) return { kind: "not_ready", reason: `The org folder still holds retired team authorities: ${retired.join(", ")}.` };
    }
    return { kind: read.kind === "task_agent_team" ? "task_agent_team" : "ready" };
  }
}
