import fs from "node:fs/promises";
import path from "node:path";
import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type { TaskAgentCoordinatingRun } from "../../../run-history/store/agent-run-metadata-types.js";
import type { AtomicRunPackageFileCommitWriter } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import { parseTaskAgentRunMetadata } from "../../../run-history/store/task-agent-own-file-schema.js";
import { TaskAgentOwnFiles } from "../../../run-history/store/task-agent-own-files.js";
import { taskAgentOwnMetadata, taskAgentTeamOwnTree, taskExecutionLinkOf } from "../../../run-history/store/task-agent-own-records.js";
import { validateTaskAgentTeamTreePayload } from "../../../run-history/store/task-agent-team-tree-schema.js";
import {
  ReleasedAgentOrgCommunicationMessagesReader,
  ReleasedStandaloneRootMessagesReader,
  ReleasedTeamCommunicationMessagesReader,
  type TaskExecution,
} from "../../legacy/released-run-package-shapes/released-trees-before-task-agent-own-run.js";
import {
  ReleasedTaskAgentMessageLogs,
  type CollaborationCommunicationMessage,
} from "../../legacy/released-run-package-shapes/released-message-logs-before-append-only.js";
import type { ReleasedCoordinatingTree, ReleasedTaskEntry } from "./released-coordinating-trees.js";

/**
 * One coordinating run's migration (contract §8): per task agent, nested ones first: already done? →
 * own file inside its current folder → rename the folder to L1 (an unmaterialized one gets its own file
 * at L1); then one reduced tree (L4) and the merge of each task agent's messages into its own log. Every
 * step recognizes from the files what is already done, so the next start continues after any stop.
 */

export type TaskAgentDisposition = "MIGRATED" | "SKIPPED_ALREADY_CURRENT" | "SKIPPED_UNMATERIALIZED" | "FAILED_OPERATION"
  /** The coordinating run's log cannot be read: nothing to merge now (the next start merges once it is readable). */
  | "PRESERVED_UNREADABLE_LOG";
export type TaskAgentOutcome = Readonly<{ runId: string; disposition: TaskAgentDisposition; message?: string }>;

type Json = Record<string, unknown>;
type PlannedTaskAgent = Readonly<{ record: TaskExecution; oldDir: string; descendants: readonly string[] }>;

const RUN_METADATA_FILE = "run_metadata.json";
const TEAM_TREE_FILE = "team_run_execution_tree.json";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const runIdOf = (task: TaskExecution): string => "agentRunId" in task ? task.agentRunId : task.teamRunId;
const lstatKind = (target: string): Promise<"missing" | "directory" | "other"> =>
  fs.lstat(target).then((stat) => stat.isDirectory() ? "directory" as const : "other" as const,
    (error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return "missing" as const; throw error; });

/** Post-order (nested first): a task team's nested records live inside its folder and move out before it. */
const plan = (tree: ReleasedCoordinatingTree): PlannedTaskAgent[] => {
  const planned: PlannedTaskAgent[] = [];
  const visit = (record: TaskExecution, containerDir: string): string[] => {
    const oldDir = path.join(containerDir, runIdOf(record));
    const descendants = "teamRunId" in record ? record.taskExecutions.flatMap((child) => [...visit(child, oldDir), runIdOf(child)]) : [];
    planned.push({ record, oldDir, descendants });
    return descendants;
  };
  for (const list of tree.lists) {
    for (const entry of list.entries) if (entry.kind === "record") visit(entry.record, list.containerDir);
  }
  return planned;
};

export class CoordinatingRunMigration {
  private readonly files: TaskAgentOwnFiles;
  private readonly logs: ReleasedTaskAgentMessageLogs;

  constructor(private readonly input: Readonly<{
    memoryDir: string;
    tree: ReleasedCoordinatingTree;
    writer: AtomicRunPackageFileCommitWriter;
    /** Reads the reduced tree back with the current store (composes and validates). */
    readBackWithCurrentStore(): Promise<unknown>;
  }>) {
    this.files = new TaskAgentOwnFiles(input.memoryDir, input.writer);
    this.logs = new ReleasedTaskAgentMessageLogs(input.memoryDir, input.writer);
  }

  private get coordinatingRun(): TaskAgentCoordinatingRun {
    return { kind: this.input.tree.family, runId: this.input.tree.runId };
  }

  async run(): Promise<readonly TaskAgentOutcome[]> {
    const planned = plan(this.input.tree);
    const outcomes = new Map<string, TaskAgentOutcome>();
    for (const item of planned) {
      const runId = runIdOf(item.record);
      outcomes.set(runId, await this.migrateOne(item).catch((error) =>
        ({ runId, disposition: "FAILED_OPERATION" as const, message: message(error) })));
    }
    const owned = new Set<string>();
    for (const [runId, outcome] of outcomes) if (outcome.disposition !== "FAILED_OPERATION") owned.add(runId);
    try {
      await this.reduceTree(owned, new Map(planned.map((item) => [runIdOf(item.record), item.descendants])));
    } catch (error) {
      const reason = `The tree could not be reduced: ${message(error)}`;
      for (const [runId, outcome] of outcomes) {
        if (outcome.disposition !== "FAILED_OPERATION") outcomes.set(runId, { runId, disposition: "FAILED_OPERATION", message: reason });
      }
      return [...outcomes.values()];
    }
    for (const failure of await this.mergeLogs(planned)) outcomes.set(failure.runId, failure);
    return [...outcomes.values()];
  }

  /** Steps 1–3 for one task agent. */
  private async migrateOne(item: PlannedTaskAgent): Promise<TaskAgentOutcome> {
    const runId = runIdOf(item.record);
    const target = "agentRunId" in item.record ? this.files.agentMemoryDir(runId) : this.files.teamDir(runId);
    if (await this.isOwnedHere(item.record)) {
      if (await lstatKind(item.oldDir) !== "missing") throw new Error(`Both '${item.oldDir}' and its own folder exist.`);
      return { runId, disposition: "SKIPPED_ALREADY_CURRENT" };
    }
    if (await lstatKind(target) !== "missing") throw new Error(`'${target}' already exists; it is never overwritten.`);
    const oldKind = await lstatKind(item.oldDir);
    if (oldKind === "other") throw new Error(`'${item.oldDir}' is not a directory.`);
    if (oldKind === "missing") {
      const written = "agentRunId" in item.record
        ? await this.files.writeAgent(this.ownMetadata(item.record))
        : await this.files.writeTeam(this.ownTeamTree(item.record));
      if (written.outcome !== "committed") throw written.cause;
      return { runId, disposition: "SKIPPED_UNMATERIALIZED" };
    }
    await this.writeOwnFileInside(item.record, item.oldDir);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.rename(item.oldDir, target);
    if (await lstatKind(item.oldDir) !== "missing" || await lstatKind(target) !== "directory") {
      throw new Error(`The move of '${item.oldDir}' to '${target}' did not complete.`);
    }
    return { runId, disposition: "MIGRATED" };
  }

  /** The own file at L1 names this coordinating run. */
  private async isOwnedHere(record: TaskExecution): Promise<boolean> {
    const state = "agentRunId" in record ? await this.files.readAgent(record.agentRunId) : await this.files.readTeam(record.teamRunId);
    if (state.kind !== "present") return false;
    const own = "metadata" in state ? state.metadata.taskAgent : state.tree.taskAgent;
    return own.coordinatingRun.kind === this.coordinatingRun.kind && own.coordinatingRun.runId === this.coordinatingRun.runId;
  }

  private resolvePlace = (address: AgentTeamAddress) => {
    for (const place of this.input.tree.configuredPlaces) {
      if (place.address === address) return place;
      if ("teamRunId" in place) {
        const member = place.members.find((candidate) => candidate.address === address);
        if (member) return member;
      }
    }
    return null;
  };

  /** A migrated copy of a configured place never recorded the launch it started with (U-4): `null`. */
  private ownMetadata(record: Extract<TaskExecution, { agentRunId: string }>) {
    const metadata = taskAgentOwnMetadata({
      record, coordinatingRun: this.coordinatingRun, memoryDir: this.files.agentMemoryDir(record.agentRunId),
      resolvePlace: this.resolvePlace, existing: null,
    });
    return parseTaskAgentRunMetadata(metadata.taskAgent.origin === "catalog" ? metadata : {
      ...metadata, workspaceRootPath: null, llmModelIdentifier: null, llmConfig: null, autoExecuteTools: null, runtimeKind: null,
    }, record.agentRunId);
  }

  /** Nested records are lifted to the coordinating run's links (CM-7, U-5): a team's own tree holds none. */
  private ownTeamTree(record: Extract<TaskExecution, { teamRunId: string }>) {
    return validateTaskAgentTeamTreePayload(taskAgentTeamOwnTree({
      record: { ...record, taskExecutions: [] }, coordinatingRun: this.coordinatingRun,
      resolvePlace: this.resolvePlace, treeHandoffs: this.input.tree.handoffs, existing: null,
    }), record.teamRunId);
  }

  private async writeOwnFileInside(record: TaskExecution, dir: string): Promise<void> {
    const result = "agentRunId" in record
      ? await this.input.writer.write({ file: "task_agent_run_metadata", filePath: path.join(dir, RUN_METADATA_FILE), payload: this.ownMetadata(record) })
      : await this.input.writer.write({ file: "task_agent_team_tree", filePath: path.join(dir, TEAM_TREE_FILE), payload: this.ownTeamTree(record) });
    if (result.outcome !== "committed") throw result.cause;
    const readBack = JSON.parse(await fs.readFile(path.join(dir, "agentRunId" in record ? RUN_METADATA_FILE : TEAM_TREE_FILE), "utf8")) as unknown;
    if ("agentRunId" in record) parseTaskAgentRunMetadata(readBack, record.agentRunId);
    else validateTaskAgentTeamTreePayload(readBack, record.teamRunId);
  }

  /**
   * Step 4 (L4): a record becomes its link when it and every record nested in it own their files; nested
   * records are lifted to links of the coordinating run's top level. Anything else stays unchanged. One
   * atomic write, read back with the current store.
   */
  private async reduceTree(owned: ReadonlySet<string>, descendants: ReadonlyMap<string, readonly string[]>): Promise<void> {
    const tree = this.input.tree;
    const lifted: Json[] = [];
    const reduceEntry = (entry: ReleasedTaskEntry): Json => {
      if (entry.kind === "link") return entry.raw;
      const runId = runIdOf(entry.record);
      if (!owned.has(runId) || !(descendants.get(runId) ?? []).every((id) => owned.has(id))) return entry.raw;
      const liftNested = (task: TaskExecution): void => {
        if (!("teamRunId" in task)) return;
        for (const child of task.taskExecutions) { lifted.push(taskExecutionLinkOf(child) as Json); liftNested(child); }
      };
      liftNested(entry.record);
      return taskExecutionLinkOf(entry.record) as Json;
    };
    const next = structuredClone(tree.raw);
    const reducedLists = new Map(tree.lists.map((list) => [list.key, list.entries.map(reduceEntry)]));
    reducedLists.set("root", [...reducedLists.get("root") ?? [], ...lifted]);
    const container = tree.family === "agent" ? next : (tree.family === "agent_team" ? next.rootTeam : next.rootOrg) as Json;
    container.taskExecutions = reducedLists.get("root");
    if (tree.family === "agent_org") {
      for (const member of container.members as Json[]) {
        if (typeof member.teamRunId === "string") member.taskExecutions = reducedLists.get(`configured_team:${member.teamRunId}`) ?? [];
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(tree.raw)) {
      const result = await this.input.writer.write({ file: "execution_tree", filePath: tree.treePath, payload: next });
      if (result.outcome !== "committed") throw result.cause;
    }
    await this.input.readBackWithCurrentStore();
  }

  /**
   * Step 5 (ARCH-F-003): every task agent at L1 of this run — moved now or on an earlier start, so linked
   * entries count too — gets the coordinating log's messages that belong to it. A team's parts are its own
   * tree's members.
   */
  private async mergeLogs(planned: readonly PlannedTaskAgent[]): Promise<TaskAgentOutcome[]> {
    let coordinatingLog: readonly CollaborationCommunicationMessage[];
    try { coordinatingLog = await this.readCoordinatingLog(); }
    catch (error) {
      return [{ runId: this.input.tree.runId, disposition: "PRESERVED_UNREADABLE_LOG", message: `The run's message log cannot be read: ${message(error)}` }];
    }
    const taskAgents = new Map<string, "agent" | "team">();
    for (const { record } of planned) taskAgents.set(runIdOf(record), "agentRunId" in record ? "agent" : "team");
    for (const list of this.input.tree.lists) {
      for (const entry of list.entries) if (entry.kind === "link") taskAgents.set(entry.runId, "agentRunId" in entry.raw ? "agent" : "team");
    }
    const failures: TaskAgentOutcome[] = [];
    for (const [runId, kind] of taskAgents) {
      try {
        const parts = await this.partsAtL1(runId, kind);
        if (!parts) continue;
        const belongs = coordinatingLog.filter((entry) => parts.has(entry.senderAgentRunId) || parts.has(entry.receiverAgentRunId));
        const result = await this.logs.merge(kind === "agent"
          ? { kind: "task_agent", agentRunId: runId } : { kind: "task_agent_team", teamRunId: runId },
        belongs, { ensureExists: kind === "team" });
        if (result && result.outcome !== "committed") throw result.cause;
      } catch (error) {
        failures.push({ runId, disposition: "FAILED_OPERATION", message: `Message log merge failed: ${message(error)}` });
      }
    }
    return failures;
  }

  /** The task agent's parts when its own file at L1 names this run; `null` otherwise. */
  private async partsAtL1(runId: string, kind: "agent" | "team"): Promise<ReadonlySet<string> | null> {
    const state = kind === "agent" ? await this.files.readAgent(runId) : await this.files.readTeam(runId);
    if (state.kind !== "present") return null;
    const own = "metadata" in state ? state.metadata.taskAgent : state.tree.taskAgent;
    if (own.coordinatingRun.kind !== this.coordinatingRun.kind || own.coordinatingRun.runId !== this.coordinatingRun.runId) return null;
    return new Set("metadata" in state ? [runId] : state.tree.rootTeam.members.map((member) => member.agentRunId));
  }

  private async readCoordinatingLog(): Promise<readonly CollaborationCommunicationMessage[]> {
    const tree = this.input.tree;
    switch (tree.family) {
      case "agent": return (await new ReleasedStandaloneRootMessagesReader().read(tree.dir, tree.runId))?.messages ?? [];
      case "agent_team": return (await new ReleasedTeamCommunicationMessagesReader().read(tree.dir, tree.runId))?.messages ?? [];
      case "agent_org": return (await new ReleasedAgentOrgCommunicationMessagesReader().read(tree.dir, tree.runId))?.messages ?? [];
    }
  }
}
