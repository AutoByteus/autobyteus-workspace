import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { TASK_AGENT_PLACEMENT } from "../../agent-memory/domain/agent-run-memory-placement.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { TaskAgentTeamTreeFile } from "../../agent-team-execution/domain/task-agent-team-tree.js";
import { TeamCommunicationStore } from "../../services/team-communication/team-communication-store.js";
import { AgentRunMetadataStore, type TaskAgentRunMetadataReadState } from "./agent-run-metadata-store.js";
import type { TaskAgentCoordinatingRun, TaskAgentRunMetadata, TaskAgentSection } from "./agent-run-metadata-types.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";
import { hasTaskAgentSection, parseTaskAgentSection } from "./task-agent-own-file-schema.js";
import {
  adoptedAgentRunFile,
  adoptedTeamRunFile,
  handStartedAgentRunFile,
  handStartedTeamRunFile,
} from "./hand-started-run-adoption-shape.js";
import { validateTaskAgentTeamTreePayload } from "./task-agent-team-tree-schema.js";
import { getTeamRunExecutionTreePath } from "./team-run-execution-tree-path.js";

/** A run by its own ID: an agent run or a team run. */
export type OwnFileRun = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>;

export type TaskAgentTeamTreeReadState =
  | Readonly<{ kind: "present"; tree: TaskAgentTeamTreeFile }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unreadable"; error: Error }>;

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));
const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const teamState = (read: () => string, teamRunId: string): TaskAgentTeamTreeReadState => {
  try {
    const parsed: unknown = JSON.parse(read());
    // A team run's tree is not a task agent team's own tree (G2's counterpart).
    if (!hasTaskAgentSection(parsed)) return { kind: "missing" };
    return { kind: "present", tree: validateTaskAgentTeamTreePayload(parsed, teamRunId) };
  } catch (error) {
    return isMissing(error) ? { kind: "missing" } : { kind: "unreadable", error: asError(error) };
  }
};

/**
 * Task agents' own files under one memory root (contract L1, §3.1, §3.2): an agent's `run_metadata.json`
 * at `agents/<id>/`, a task agent team's tree (and its message log) at `agent_teams/<id>/`. Used by the
 * tree stores to split and compose; no other runtime code reads or writes these files.
 */
export class TaskAgentOwnFiles {
  private readonly layout: AgentMemoryLayout;
  private readonly metadata: AgentRunMetadataStore;

  constructor(
    memoryRoot: string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {
    this.layout = new AgentMemoryLayout(memoryRoot);
    this.metadata = new AgentRunMetadataStore(memoryRoot, writer);
  }

  agentMemoryDir(agentRunId: string): string {
    return this.layout.getAgentRunMemoryDirPath(TASK_AGENT_PLACEMENT, agentRunId);
  }

  teamDir(teamRunId: string): string {
    return this.layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] });
  }

  readAgent(agentRunId: string): Promise<TaskAgentRunMetadataReadState> {
    return this.metadata.readTaskAgentMetadataState(agentRunId);
  }

  readAgentSync(agentRunId: string): TaskAgentRunMetadataReadState {
    return this.metadata.readTaskAgentMetadataStateSync(agentRunId);
  }

  writeAgent(metadata: TaskAgentRunMetadata): Promise<RunPackageFileWriteResult> {
    return this.metadata.writeTaskAgentMetadata(metadata);
  }

  async readTeam(teamRunId: string): Promise<TaskAgentTeamTreeReadState> {
    let text: string;
    try { text = await fsPromises.readFile(getTeamRunExecutionTreePath(this.teamDir(teamRunId)), "utf-8"); }
    catch (error) { return isMissing(error) ? { kind: "missing" } : { kind: "unreadable", error: asError(error) }; }
    return teamState(() => text, teamRunId);
  }

  readTeamSync(teamRunId: string): TaskAgentTeamTreeReadState {
    return teamState(() => fs.readFileSync(getTeamRunExecutionTreePath(this.teamDir(teamRunId)), "utf-8"), teamRunId);
  }

  /** Writes a task agent team's own tree; its own message log is created first when missing. */
  async writeTeam(tree: TaskAgentTeamTreeFile): Promise<RunPackageFileWriteResult> {
    const teamRunId = tree.rootTeam.teamRunId;
    const dir = this.teamDir(teamRunId);
    const messages = new TeamCommunicationStore(this.writer);
    if (!await messages.readLog(dir, teamRunId)) {
      const log = await messages.write(dir, { schemaVersion: 1, rootTeamRunId: teamRunId, messages: [] });
      if (log.outcome !== "committed") return log;
    }
    return this.writer.write({
      file: "task_agent_team_tree",
      filePath: getTeamRunExecutionTreePath(dir),
      payload: validateTaskAgentTeamTreePayload(tree, teamRunId),
    });
  }

  /**
   * Adoption step 3 (design SR-008): the hand-started run's own file gains `taskAgent` and, for a team, its address
   * frame moves from `/` to `section.address`; every other key is kept. Raw JSON, written atomically.
   */
  adoptOwnFile(run: OwnFileRun, section: TaskAgentSection): Promise<RunPackageFileWriteResult> {
    return this.rewriteRaw(run, (raw) => "agentRunId" in run ? adoptedAgentRunFile(raw, section) : adoptedTeamRunFile(raw, section));
  }

  /** The inverse of `adoptOwnFile`: the run's file exactly as it was before the adoption (a team back at `/`). */
  restoreHandStartedFile(run: OwnFileRun): Promise<RunPackageFileWriteResult> {
    return this.rewriteRaw(run, (raw) => "agentRunId" in run ? handStartedAgentRunFile(raw) : handStartedTeamRunFile(raw));
  }

  /** The coordinating run an own file names; `null` without a file or a `taskAgent` section. Reads the raw file. */
  async coordinatingRunOf(run: OwnFileRun): Promise<TaskAgentCoordinatingRun | null> {
    let raw: unknown;
    try { raw = JSON.parse(await fsPromises.readFile(this.ownFilePath(run), "utf-8")); }
    catch (error) { if (isMissing(error)) return null; throw error; }
    return hasTaskAgentSection(raw) ? parseTaskAgentSection((raw as Record<string, unknown>).taskAgent).coordinatingRun : null;
  }

  private ownFilePath(run: OwnFileRun): string {
    return "agentRunId" in run ? this.metadata.getMetadataPath(run.agentRunId) : getTeamRunExecutionTreePath(this.teamDir(run.teamRunId));
  }

  private async rewriteRaw(run: OwnFileRun, change: (raw: unknown) => Record<string, unknown>): Promise<RunPackageFileWriteResult> {
    const filePath = this.ownFilePath(run);
    const payload = change(JSON.parse(await fsPromises.readFile(filePath, "utf-8")));
    return this.writer.write({ file: "agentRunId" in run ? "run_metadata" : "team_run_execution_tree", filePath, payload });
  }
}
