import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { AgentRunMemoryPlacement } from "../../agent-memory/domain/agent-run-memory-placement.js";
import { TASK_AGENT_PLACEMENT } from "../../agent-memory/domain/agent-run-memory-placement.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { TaskExecution } from "../domain/run-execution-tree-shared-records.js";
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

/** Whose log a message endpoint's messages belong to, from the endpoint's memory placement. */
export type MessageLogOwner =
  | Readonly<{ kind: "coordinating" }>
  | Readonly<{ kind: "task_agent"; agentRunId: string }>
  | Readonly<{ kind: "task_agent_team"; teamRunId: string }>;

export const COORDINATING_LOG: MessageLogOwner = Object.freeze({ kind: "coordinating" });

export const messageLogOwnerOf = (agentRunId: string, placement: AgentRunMemoryPlacement): MessageLogOwner => {
  switch (placement.kind) {
    case "run_part": return COORDINATING_LOG;
    case "task_agent": return Object.freeze({ kind: "task_agent", agentRunId });
    case "task_agent_team_member": return Object.freeze({ kind: "task_agent_team", teamRunId: placement.teamRunId });
  }
};

const sameOwner = (left: MessageLogOwner, right: MessageLogOwner): boolean =>
  left.kind === right.kind
  && (left.kind !== "task_agent" || left.agentRunId === (right as typeof left).agentRunId)
  && (left.kind !== "task_agent_team" || left.teamRunId === (right as typeof left).teamRunId);

/** The logs one message belongs to: the receiver's first, then the sender's when it is another run (DEC-011). */
export const messageLogOwners = (
  message: Pick<CollaborationCommunicationMessage, "senderAgentRunId" | "receiverAgentRunId">,
  ownerOf: (agentRunId: string) => MessageLogOwner,
): readonly MessageLogOwner[] => {
  const receiver = ownerOf(message.receiverAgentRunId);
  const sender = ownerOf(message.senderAgentRunId);
  return Object.freeze(sameOwner(receiver, sender) ? [receiver] : [receiver, sender]);
};

type TaskAgentLogOwner = Exclude<MessageLogOwner, { kind: "coordinating" }>;

/** Task agents' own message logs under one memory root: where each one is (on top of `MessageLog`). */
export class TaskAgentMessageLogs {
  private readonly layout: AgentMemoryLayout;

  constructor(
    memoryRoot: string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  /** The task agent's messages; none while its log does not exist yet. */
  async read(owner: TaskAgentLogOwner): Promise<readonly CollaborationCommunicationMessage[]> {
    return await this.logOf(owner).read() ?? [];
  }

  /** Appends the message to the task agent's log; its first message creates the log. */
  append(owner: TaskAgentLogOwner, message: CollaborationCommunicationMessage): Promise<RunPackageFileWriteResult> {
    return this.logOf(owner).append(message);
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

/** The own logs of a coordinating run's loaded task agents. */
export const taskAgentLogOwners = (lists: Iterable<readonly TaskExecution[]>): TaskAgentLogOwner[] =>
  [...lists].flatMap((tasks) => tasks.map((task): TaskAgentLogOwner => "agentRunId" in task
    ? { kind: "task_agent", agentRunId: task.agentRunId }
    : { kind: "task_agent_team", teamRunId: task.teamRunId }));

/**
 * Writes one committed message to its logs in order. Nothing durable before the first log commits; a
 * failure after an earlier log is durable is a post-durability failure, reported as indeterminate so the
 * coordinator fail-stops as for any indeterminate write (contract V-11).
 */
export const appendMessageToOwnerLogs = async (
  owners: readonly MessageLogOwner[],
  append: (owner: MessageLogOwner) => Promise<RunPackageFileWriteResult>,
): Promise<RunPackageFileWriteResult<"communication_messages">> => {
  let durable = false;
  for (const owner of owners) {
    const result = await append(owner);
    if (result.outcome === "committed") { durable = true; continue; }
    if (!durable || result.outcome === "renamed_finalization_indeterminate") {
      return { ...result, file: "communication_messages" };
    }
    return {
      outcome: "renamed_finalization_indeterminate",
      file: "communication_messages",
      stage: "sync_directory",
      cause: new Error(`A message log after an earlier durable log did not commit: ${result.cause.message}`),
    };
  }
  return { outcome: "committed", file: "communication_messages" };
};

/**
 * The stored view of a coordinating run's messages: its own log and its loaded task agents' logs, each
 * message once (by `messageId`), only messages whose endpoints are loaded (L6), in `createdAt` order.
 */
export const composeMessageLogs = (
  logs: readonly (readonly CollaborationCommunicationMessage[])[],
  loadedAgentRunIds: ReadonlySet<string>,
): CollaborationCommunicationMessage[] => {
  const byId = new Map<string, CollaborationCommunicationMessage>();
  for (const log of logs) {
    for (const message of log) {
      if (byId.has(message.messageId)) continue;
      if (!loadedAgentRunIds.has(message.senderAgentRunId) || !loadedAgentRunIds.has(message.receiverAgentRunId)) continue;
      byId.set(message.messageId, message);
    }
  }
  return [...byId.values()]
    .map((message, order) => ({ message, order }))
    .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || left.order - right.order)
    .map(({ message }) => message);
};
