import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../frozen/server/agent-memory/store/agent-memory-layout.js";
import { atomicWriteJsonFile } from "../../frozen/server/run-history/store/atomic-json-file-writer.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../../domain/app-data-migration-types.js";
import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import type { RunHistoryCatalogInvalidation } from "../../domain/run-history-catalog-invalidation.js";
import { folders, isRecord, readRaw, ReleasedDelegationScan, type RawRecord, type ScannedTree } from "./released-delegation-scan.js";
import { convertTaskRecord } from "./task-record-conversion.js";
import { convertAgentRunFile, convertTeamRunFile, type RunFileConversion } from "./run-file-conversion.js";

export const DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID = "20261111_delegated_runs_own_runs_v1";
const TASK_RECORD_FILE = "agent_run_resources.json";
const BUSY_RUN_RECORD = path.join("restart-resume", "busy-runs.json");
const AGENT_HISTORY_INDEX = "run_history_index.json";
const TEAM_HISTORY_INDEX = "team_run_history_index.json";

/** The migration's steps (the class comment's numbers): 1 … 3, 4, 5, 5b, 6, 7, 8. */
export type DelegatedRunsStep = "taskRecords" | "runFiles" | "standaloneTrees" | "agentRunLogs" | "lists" | "busyRuns" | "historyRows";
/** Which steps a migration of this family applies, under which ID and after which prerequisites (SR-078: the follow-ups). */
export type DelegatedRunsPlan = Readonly<{
  id: string;
  displayName: string;
  description: string;
  prerequisiteMigrationIds?: readonly string[];
  steps: readonly DelegatedRunsStep[];
}>;
const MAIN_PLAN: DelegatedRunsPlan = {
  id: DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID,
  displayName: "Delegated runs become runs of their own",
  description: "Stores each delegation once per side (the Task entry and the delegated run's own file) and removes the hosting shapes.",
  steps: ["taskRecords", "runFiles", "standaloneTrees", "agentRunLogs", "lists", "busyRuns", "historyRows"],
};

type Disposition = "MIGRATED" | "SKIPPED_ALREADY_CURRENT" | "PRESERVED_UNFINISHED_PREDECESSOR" | "PRESERVED_UNREADABLE"
  | "PRESERVED_UNSUPPORTED" | "FAILED_OPERATION";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * `20261111_delegated_runs_own_runs_v1` (autobyteus-461, design DS-10, contract §5 and §13.2): a delegated run becomes an
 * ordinary run with its own `delegatedFrom`; the delegation is stored once per side.
 *
 * In this order (each step is recognized as done by its shape, so a retry continues where it stopped):
 * 1 … 3 every Task entry gets `delegatedFrom` (one hop), `subWork`, and a peer run's `nodeId` and `members`;
 * 4 a delegated run's `taskAgent` becomes its own `delegatedFrom`, `address` and launch (E6), a peer-started run's
 *   `coordinatingRun` is renamed (E10);
 * 5 a standalone run's `collaboration_tree.json` goes after its `host.address` moved to `run_metadata.json` (E8);
 * 5b an agent run's message log moves from `collaboration/` up to its own folder, and the empty folder goes (E11, TC-13);
 * 6 team and org trees lose their `taskExecutions` lists (E9);
 * 7 a busy-run entry of a delegated run moves under the run's own root;
 * 8 every delegated run gets its history row (names through the definition-name port, else the definition ID).
 *
 * No prerequisite hold; registered after its four predecessors (AR-005). A predecessor's unfinished item is left as
 * it is and reported (`PRESERVED_UNFINISHED_PREDECESSOR`); every Task entry is converted in every case. One atomic
 * write per file; nothing is deleted except the converted standalone tree file. Startup only.
 *
 * The same steps, with the same builders, are the follow-ups' (SR-078, DS-10 "After the predecessor finishes the item"):
 * a follow-up applies the steps its predecessor's items need, after that predecessor (`delegated-runs-preserved-items-v1.ts`).
 */
export class DelegatedRunsOwnRunsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly prerequisiteMigrationIds?: readonly string[];
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  private readonly steps: ReadonlySet<DelegatedRunsStep>;

  private readonly layout: AgentMemoryLayout;
  private readonly details: AppDataMigrationItemDetail[] = [];
  private scanned = 0;

  constructor(
    private readonly appDataDir: string,
    private readonly memoryDir: string,
    private readonly names: DefinitionNameLookup,
    private readonly catalogs: RunHistoryCatalogInvalidation | null = null,
    plan: DelegatedRunsPlan = MAIN_PLAN,
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.id = plan.id;
    this.displayName = plan.displayName;
    this.description = plan.description;
    if (plan.prerequisiteMigrationIds) this.prerequisiteMigrationIds = plan.prerequisiteMigrationIds;
    this.steps = new Set(plan.steps);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.details.length = 0;
    this.scanned = 0;
    const scan = await new ReleasedDelegationScan(this.layout).scan();
    const step = (name: DelegatedRunsStep, run: (scan: ReleasedDelegationScan) => Promise<void>) => this.steps.has(name) ? run.call(this, scan) : Promise.resolve();
    await step("taskRecords", this.convertTaskRecords);
    await step("runFiles", this.convertRunFiles);
    await step("standaloneTrees", this.convertStandaloneTrees);
    await step("agentRunLogs", this.moveAgentRunLogs);
    await step("lists", this.convertLists);
    await step("busyRuns", this.convertBusyRunRecord);
    await step("historyRows", this.addHistoryRows);
    return this.result();
  }

  /** Steps 1 … 3. */
  private async convertTaskRecords(scan: ReleasedDelegationScan): Promise<void> {
    const files: string[] = [];
    const projects = path.join(this.appDataDir, "projects");
    for (const project of await folders(projects)) {
      for (const task of await folders(path.join(projects, project, "tasks"))) files.push(path.join(projects, project, "tasks", task, TASK_RECORD_FILE));
    }
    const adHoc = path.join(this.appDataDir, "ad-hoc-tasks");
    for (const task of await folders(adHoc)) files.push(path.join(adHoc, task, TASK_RECORD_FILE));
    for (const filePath of files) {
      const file = await readRaw(filePath);
      if (file.kind === "missing") continue;
      const itemId = `task_record:${path.basename(path.dirname(filePath))}`;
      this.scanned += 1;
      if (file.kind === "unreadable") { this.add(itemId, filePath, "PRESERVED_UNREADABLE", file.reason); continue; }
      const conversion = convertTaskRecord(file.raw, scan);
      if (conversion.kind === "current") this.add(itemId, filePath, "SKIPPED_ALREADY_CURRENT");
      else if (conversion.kind === "unconvertible") this.add(itemId, filePath, "PRESERVED_UNSUPPORTED", conversion.reason);
      else await this.write(itemId, filePath, conversion.payload);
    }
  }

  /** Step 4 (and E10). */
  private async convertRunFiles(scan: ReleasedDelegationScan): Promise<void> {
    for (const [runId, file] of scan.agentRunFiles) {
      if (file.kind !== "present") continue;
      const filePath = scan.agentFilePath(runId);
      const conversion = convertAgentRunFile(runId, file.raw, scan);
      if (conversion.kind === "current") continue;
      this.scanned += 1;
      await this.apply(`agent_run:${runId}`, filePath, conversion);
    }
    for (const [runId, file] of scan.teamRunFiles) {
      if (file.kind !== "present") continue;
      const rootTeam = isRecord(file.raw.rootTeam) ? file.raw.rootTeam : {};
      const definitionId = typeof rootTeam.teamDefinitionId === "string" ? rootTeam.teamDefinitionId : "";
      const name = isRecord(file.raw.taskAgent) && typeof rootTeam.teamDefinitionName !== "string" ? await this.teamName(definitionId) : definitionId;
      const conversion = convertTeamRunFile(runId, file.raw, scan, name);
      if (conversion.kind === "current") continue;
      this.scanned += 1;
      await this.apply(`team_run:${runId}`, scan.teamFilePath(runId), conversion);
    }
  }

  /** Step 5: the host address moves to `run_metadata.json`, then the tree file goes; the message log stays. */
  private async convertStandaloneTrees(scan: ReleasedDelegationScan): Promise<void> {
    for (const tree of scan.trees.filter((candidate) => candidate.owner.kind === "agent")) {
      const runId = tree.owner.runId;
      const itemId = `standalone_tree:${runId}`;
      this.scanned += 1;
      const unfinished = scan.unfinishedTrees.get(tree.filePath);
      if (unfinished) { this.add(itemId, tree.filePath, "PRESERVED_UNFINISHED_PREDECESSOR", unfinished); continue; }
      const metadataPath = scan.agentFilePath(runId);
      const metadata = await readRaw(metadataPath);
      if (metadata.kind !== "present") {
        this.add(itemId, tree.filePath, "PRESERVED_UNREADABLE", `its run_metadata.json is ${metadata.kind === "missing" ? "missing" : `unreadable: ${metadata.reason}`}`);
        continue;
      }
      const address = isRecord(tree.raw.host) ? tree.raw.host.address : undefined;
      if (typeof address !== "string" || !address.trim()) { this.add(itemId, tree.filePath, "PRESERVED_UNSUPPORTED", "host.address is missing"); continue; }
      try {
        if (metadata.raw.address === undefined) await atomicWriteJsonFile(metadataPath, { ...metadata.raw, address });
        await fs.rm(tree.filePath, { force: true });
        this.add(itemId, tree.filePath, "MIGRATED");
      } catch (error) {
        this.add(itemId, tree.filePath, "FAILED_OPERATION", message(error));
      }
    }
  }

  /**
   * Step 5b (TC-13): every agent run logs in its own folder, `agents/<id>/communication_messages_*.jsonl`. The append-only
   * files move up from `collaboration/`; the folder goes when it is empty. A folder that still holds an unconverted JSON
   * log of `20261018_…` stays as it is, for that migration's retry; a name already taken in the run folder is reported.
   */
  private async moveAgentRunLogs(scan: ReleasedDelegationScan): Promise<void> {
    const appendOnly = /^communication_messages_(active|\d+)\.jsonl$/;
    for (const [runId] of scan.agentRunFiles) {
      const runDir = path.dirname(scan.agentFilePath(runId));
      const collaborationDir = path.join(runDir, "collaboration");
      const names = await fs.readdir(collaborationDir).catch(() => null);
      if (!names) continue;
      const logs = names.filter((name) => appendOnly.test(name));
      const itemId = `agent_run_log:${runId}`;
      if (names.some((name) => name.endsWith(".json") && name !== "collaboration_tree.json")) {
        if (logs.length) { this.scanned += 1; this.add(itemId, collaborationDir, "PRESERVED_UNFINISHED_PREDECESSOR", "20261018_append_only_message_logs_v1: a JSON message log is not converted yet"); }
        continue;
      }
      if (!logs.length) { await fs.rmdir(collaborationDir).catch(() => undefined); continue; }
      this.scanned += 1;
      const taken = [];
      for (const name of logs) if (await fs.access(path.join(runDir, name)).then(() => true, () => false)) taken.push(name);
      if (taken.length) { this.add(itemId, collaborationDir, "PRESERVED_UNSUPPORTED", `the run folder already has ${taken.join(", ")}`); continue; }
      try {
        for (const name of logs) await fs.rename(path.join(collaborationDir, name), path.join(runDir, name));
        await fs.rmdir(collaborationDir).catch(() => undefined);
        this.add(itemId, collaborationDir, "MIGRATED");
      } catch (error) {
        this.add(itemId, collaborationDir, "FAILED_OPERATION", message(error));
      }
    }
  }

  /** Step 6: a team or org tree keeps its own units only. A delegated team's own file is step 4's. */
  private async convertLists(scan: ReleasedDelegationScan): Promise<void> {
    for (const tree of scan.trees.filter((candidate) => candidate.owner.kind !== "agent" && !candidate.isOwnFileOfDelegatedTeam)) {
      const without = withoutTaskLists(tree.raw);
      if (!without) continue;
      const itemId = `${tree.owner.kind}_tree:${tree.owner.runId}`;
      this.scanned += 1;
      const unfinished = scan.unfinishedTrees.get(tree.filePath);
      if (unfinished) { this.add(itemId, tree.filePath, "PRESERVED_UNFINISHED_PREDECESSOR", unfinished); continue; }
      await this.write(itemId, tree.filePath, without);
    }
  }

  /** Step 7: a `place: "delegated"` entry moves under its own run's root (a standalone run, or a team run's member). */
  private async convertBusyRunRecord(scan: ReleasedDelegationScan): Promise<void> {
    const filePath = path.join(this.appDataDir, BUSY_RUN_RECORD);
    const file = await readRaw(filePath);
    if (file.kind !== "present" || !Array.isArray(file.raw.entries)) return;
    if (!file.raw.entries.some((entry) => isRecord(entry) && entry.place === "delegated")) return;
    this.scanned += 1;
    const entries = file.raw.entries.flatMap((entry): unknown[] => {
      if (!isRecord(entry) || entry.place !== "delegated" || typeof entry.agentRunId !== "string") return [entry];
      const owner = scan.ownerOfAgent.get(entry.agentRunId);
      // A run that is not stored has nothing to resume.
      if (!owner || owner.kind === "agent_org") return [];
      return [{ ...entry, root: { rootSubjectKind: owner.kind, rootRunId: owner.runId }, place: owner.kind === "agent" ? "host" : "member" }];
    });
    await this.write("busy_run_record", filePath, { ...file.raw, entries });
  }

  /** Step 8: a history row for every delegated run that has none, built from its converted own file. */
  private async addHistoryRows(scan: ReleasedDelegationScan): Promise<void> {
    await this.addRows(path.join(this.memoryDir, AGENT_HISTORY_INDEX), "agent_history_index", "runId", [...scan.agentRunFiles.keys()],
      (runId) => scan.agentFilePath(runId), async (runId, raw) => {
        const definitionId = typeof raw.agentDefinitionId === "string" ? raw.agentDefinitionId : "";
        if (!definitionId || typeof raw.workspaceRootPath !== "string") return null;
        return { runId, agentDefinitionId: definitionId, agentName: await this.agentName(definitionId), workspaceRootPath: raw.workspaceRootPath,
          summary: "", createdAt: typeof raw.startedAt === "string" ? raw.startedAt : new Date().toISOString(), archivedAt: null, terminatedAt: null };
      });
    this.catalogs?.agentRunHistoryChanged(this.memoryDir);
    await this.addRows(path.join(this.memoryDir, TEAM_HISTORY_INDEX), "team_history_index", "teamRunId", [...scan.teamRunFiles.keys()],
      (runId) => scan.teamFilePath(runId), async (runId, raw) => {
        const rootTeam = isRecord(raw.rootTeam) ? raw.rootTeam : null;
        if (!rootTeam || typeof rootTeam.teamDefinitionId !== "string" || typeof raw.createdAt !== "string") return null;
        const launch = isRecord(rootTeam.defaultLaunchConfiguration) ? rootTeam.defaultLaunchConfiguration : {};
        return { teamRunId: runId, teamDefinitionId: rootTeam.teamDefinitionId,
          teamDefinitionName: typeof rootTeam.teamDefinitionName === "string" ? rootTeam.teamDefinitionName : rootTeam.teamDefinitionId,
          workspaceRootPath: typeof launch.workspaceRootPath === "string" ? launch.workspaceRootPath : null, summary: "", createdAt: raw.createdAt,
          archivedAt: typeof raw.archivedAt === "string" ? raw.archivedAt : null, terminatedAt: null };
      });
    this.catalogs?.collaborationRunHistoryChanged(this.memoryDir, "agent_team");
  }

  /**
   * Adds the rows of the delegated runs (an own file with `delegatedFrom`, no `taskAgent`) that the index lacks. An
   * unreadable index is left as it is and reported; the rows already there are kept exactly.
   */
  private async addRows(indexPath: string, itemId: string, key: string, runIds: readonly string[], filePathOf: (runId: string) => string,
    rowOf: (runId: string, raw: RawRecord) => Promise<RawRecord | null>): Promise<void> {
    let parsed: unknown = [];
    try { parsed = JSON.parse(await fs.readFile(indexPath, "utf8")); }
    catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code !== "ENOENT") { this.add(itemId, indexPath, "PRESERVED_UNREADABLE", message(error)); return; }
    }
    if (!Array.isArray(parsed) || !parsed.every(isRecord)) { this.add(itemId, indexPath, "PRESERVED_UNSUPPORTED", "the index is not a list of rows"); return; }
    const rows: RawRecord[] = parsed;
    const known = new Set(rows.map((row) => row[key]));
    const added: RawRecord[] = [];
    for (const runId of runIds) {
      if (known.has(runId)) continue;
      const file = await readRaw(filePathOf(runId));
      if (file.kind !== "present" || !isRecord(file.raw.delegatedFrom) || isRecord(file.raw.taskAgent)) continue;
      const row = await rowOf(runId, file.raw);
      if (row) added.push(row);
    }
    if (!added.length) return;
    this.scanned += 1;
    await this.write(itemId, indexPath, [...rows, ...added] as unknown as RawRecord);
  }

  private async agentName(definitionId: string): Promise<string> {
    return (await this.names.agentDefinitionName(definitionId).catch(() => null))?.trim() || definitionId;
  }
  private async teamName(definitionId: string): Promise<string> {
    return (await this.names.teamDefinitionName(definitionId).catch(() => null))?.trim() || definitionId;
  }

  private async apply(itemId: string, filePath: string, conversion: Exclude<RunFileConversion, { kind: "current" }>): Promise<void> {
    if (conversion.kind === "converted") { await this.write(itemId, filePath, conversion.payload); return; }
    this.add(itemId, filePath, conversion.predecessor ? "PRESERVED_UNFINISHED_PREDECESSOR" : "PRESERVED_UNSUPPORTED",
      conversion.predecessor ? `${conversion.predecessor}: ${conversion.reason}` : conversion.reason);
  }

  private async write(itemId: string, filePath: string, payload: RawRecord): Promise<void> {
    try {
      await atomicWriteJsonFile(filePath, payload);
      this.add(itemId, filePath, "MIGRATED");
    } catch (error) {
      this.add(itemId, filePath, "FAILED_OPERATION", message(error));
    }
  }

  private add(itemId: string, filePath: string, disposition: Disposition, reason?: string): void {
    this.details.push({
      itemId, filePath,
      status: disposition === "MIGRATED" ? "MIGRATED" : disposition === "FAILED_OPERATION" ? "FAILED" : "SKIPPED",
      message: reason ? `${disposition}: ${reason}` : disposition,
    });
    // DESIGN.md rule 7: a preserved item is left as it is, and the reason is logged by item.
    if (disposition.startsWith("PRESERVED")) console.warn(`[${this.id}] '${itemId}' is left unchanged (${disposition}): ${reason}`);
  }

  private result(): AppDataMigrationExecutionResult {
    const details = [...this.details];
    const failedCount = details.filter((item) => item.status === "FAILED").length;
    const migratedCount = details.filter((item) => item.status === "MIGRATED").length;
    const preserved = details.some((item) => item.message.startsWith("PRESERVED"));
    return {
      status: failedCount > 0 ? "FAILED" : preserved ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount: this.scanned, migratedCount, skippedCount: details.length - failedCount - migratedCount, failedCount, details },
      errorMessage: failedCount > 0 ? `${failedCount} item(s) are not converted yet; the next start continues.` : null,
    };
  }
}

/** A team or org tree without its stored `taskExecutions` lists (and an in-memory `remoteTaskExecutions`), or null when it has none. */
const withoutTaskLists = (raw: RawRecord): RawRecord | null => {
  let changed = false;
  const strip = (holder: unknown): unknown => {
    if (!isRecord(holder)) return holder;
    const { taskExecutions, remoteTaskExecutions, ...rest } = holder;
    if (taskExecutions !== undefined || remoteTaskExecutions !== undefined) changed = true;
    return { ...rest, ...(Array.isArray(rest.members) ? { members: rest.members.map((member) => isRecord(member) && typeof member.teamRunId === "string" ? strip(member) : member) } : {}) };
  };
  const next = { ...raw, ...(raw.rootTeam !== undefined ? { rootTeam: strip(raw.rootTeam) } : {}), ...(raw.rootOrg !== undefined ? { rootOrg: strip(raw.rootOrg) } : {}) };
  return changed ? next : null;
};

export type { ScannedTree };
