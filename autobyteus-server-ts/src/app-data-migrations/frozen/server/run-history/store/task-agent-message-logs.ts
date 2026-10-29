import { TASK_AGENT_PLACEMENT } from "../../agent-memory/domain/agent-run-memory-placement.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";
import { MessageLog } from "./message-log.js";

/**
 * Per-run message logs (design D-4, contract §3.4, the email model): a message between parts of one run
 * is stored once, in that run's log; a message between two runs is stored in both logs with the same
 * `messageId`. A task agent is never a part of its coordinating run: an agent task agent keeps its own
 * log (`communication_messages`) in `agents/<id>/`, a task agent team (`team_communication_messages`) in
 * `agent_teams/<id>/`; each is a `MessageLog`.
 */

/**
 * Whose log a message endpoint's messages belong to, from the endpoint's memory placement. A run on a peer
 * node (CM-10) keeps its log on its own node: on this node its side of a message is written nowhere.
 */
export type MessageLogOwner =
  | Readonly<{ kind: "coordinating" }>
  | Readonly<{ kind: "task_agent"; agentRunId: string }>
  | Readonly<{ kind: "task_agent_team"; teamRunId: string }>
  | Readonly<{ kind: "remote" }>;

/** A log that exists on this node. */
export type StoredMessageLogOwner = Exclude<MessageLogOwner, { kind: "remote" }>;

type TaskAgentLogOwner = Exclude<StoredMessageLogOwner, { kind: "coordinating" }>;

/** Task agents' own message logs under one memory root: where each one is (on top of `MessageLog`). */
export class TaskAgentMessageLogs {
  private readonly layout: AgentMemoryLayout;

  constructor(
    memoryRoot: string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  /** A new task agent team's empty log, created before its own tree; `null` when the log already exists. */
  async createTeamLogIfMissing(teamRunId: string): Promise<RunPackageFileWriteResult | null> {
    const log = this.logOf({ kind: "task_agent_team", teamRunId });
    return await log.exists() ? null : log.writeInitial([]);
  }

  private logOf(owner: TaskAgentLogOwner): MessageLog {
    return owner.kind === "task_agent"
      ? new MessageLog(this.layout.getAgentRunMemoryDirPath(TASK_AGENT_PLACEMENT, owner.agentRunId), "communication_messages", { writer: this.writer })
      : new MessageLog(this.layout.getTeamDirPath({ rootTeamRunId: owner.teamRunId, ancestorTeamRunIds: [] }),
        "team_communication_messages", { writer: this.writer });
  }
}
