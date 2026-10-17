import fsPromises from "node:fs/promises";
import path from "node:path";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { AgentRunMemoryPlacement } from "../../agent-memory/domain/agent-run-memory-placement.js";
import { TASK_AGENT_PLACEMENT } from "../../agent-memory/domain/agent-run-memory-placement.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { getTeamCommunicationMessagesPath } from "../../services/team-communication/team-communication-store.js";
import { validateTeamCommunicationMessagesPayload } from "../../services/team-communication/team-communication-messages-schema.js";
import { STANDALONE_ROOT_MESSAGES_FILE_NAME } from "../../standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { validateStandaloneRootMessages } from "../../standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import type { TaskExecution } from "../domain/run-execution-tree-shared-records.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";

/**
 * Per-run message logs (design D-4, contract §3.4, the email model): a message between parts of one run
 * is stored once, in that run's log; a message between two runs is stored in both logs with the same
 * `messageId`. A task agent is never a part of its coordinating run: an agent task agent keeps its own
 * log at `agents/<id>/communication_messages.json`, a task agent team at
 * `agent_teams/<id>/team_communication_messages.json`.
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

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** Task agents' own message logs under one memory root. */
export class TaskAgentMessageLogs {
  private readonly layout: AgentMemoryLayout;

  constructor(
    memoryRoot: string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  async read(owner: Exclude<MessageLogOwner, { kind: "coordinating" }>): Promise<readonly CollaborationCommunicationMessage[]> {
    let value: unknown;
    try { value = JSON.parse(await fsPromises.readFile(this.pathOf(owner), "utf8")); }
    catch (error) { if (isMissing(error)) return []; throw error; }
    return this.validate(owner, value).messages;
  }

  /** Adds the message when its `messageId` is absent; `null` when it is already there. A missing log is created. */
  async append(
    owner: Exclude<MessageLogOwner, { kind: "coordinating" }>,
    message: CollaborationCommunicationMessage,
  ): Promise<RunPackageFileWriteResult | null> {
    const current = await this.read(owner);
    if (current.some((entry) => entry.messageId === message.messageId)) return null;
    return this.writeLog(owner, [...current, message]);
  }

  /**
   * Merges messages into a task agent's own log: union by `messageId`, existing entries kept, ordered by
   * `createdAt`; written only when something is missing (or when `ensureExists` and the log is missing).
   * `null` when nothing was written.
   */
  async merge(
    owner: Exclude<MessageLogOwner, { kind: "coordinating" }>,
    messages: readonly CollaborationCommunicationMessage[],
    options: Readonly<{ ensureExists?: boolean }> = {},
  ): Promise<RunPackageFileWriteResult | null> {
    let current: readonly CollaborationCommunicationMessage[] | null;
    try { current = this.validate(owner, JSON.parse(await fsPromises.readFile(this.pathOf(owner), "utf8"))).messages; }
    catch (error) { if (!isMissing(error)) throw error; current = null; }
    const known = new Set((current ?? []).map((message) => message.messageId));
    const missing = messages.filter((message) => !known.has(message.messageId));
    if (missing.length === 0 && (current !== null || !options.ensureExists)) return null;
    const merged = [...(current ?? []), ...missing]
      .map((message, order) => ({ message, order }))
      .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || left.order - right.order)
      .map(({ message }) => message);
    return this.writeLog(owner, merged);
  }

  private writeLog(owner: Exclude<MessageLogOwner, { kind: "coordinating" }>, messages: readonly CollaborationCommunicationMessage[]) {
    const payload = owner.kind === "task_agent"
      ? { schemaVersion: 1, subjectKind: "agent", hostRunId: owner.agentRunId, messages }
      : { schemaVersion: 1, rootTeamRunId: owner.teamRunId, messages };
    return this.writer.write({ file: "communication_messages", filePath: this.pathOf(owner), payload: this.validate(owner, payload) });
  }

  private pathOf(owner: Exclude<MessageLogOwner, { kind: "coordinating" }>): string {
    return owner.kind === "task_agent"
      ? path.join(this.layout.getAgentRunMemoryDirPath(TASK_AGENT_PLACEMENT, owner.agentRunId), STANDALONE_ROOT_MESSAGES_FILE_NAME)
      : getTeamCommunicationMessagesPath(this.layout.getTeamDirPath({ rootTeamRunId: owner.teamRunId, ancestorTeamRunIds: [] }));
  }

  private validate(owner: Exclude<MessageLogOwner, { kind: "coordinating" }>, value: unknown) {
    return owner.kind === "task_agent"
      ? validateStandaloneRootMessages(value, owner.agentRunId)
      : validateTeamCommunicationMessagesPayload(value, owner.teamRunId);
  }
}

/** The own logs of a coordinating run's loaded task agents. */
export const taskAgentLogOwners = (lists: Iterable<readonly TaskExecution[]>): Exclude<MessageLogOwner, { kind: "coordinating" }>[] =>
  [...lists].flatMap((tasks) => tasks.map((task): Exclude<MessageLogOwner, { kind: "coordinating" }> => "agentRunId" in task
    ? { kind: "task_agent", agentRunId: task.agentRunId }
    : { kind: "task_agent_team", teamRunId: task.teamRunId }));

/**
 * Writes one committed message to its logs in order. Nothing durable before the first log commits; a
 * failure after an earlier log is durable is a post-durability failure, reported as indeterminate so the
 * coordinator fail-stops as for any indeterminate write (contract V-11).
 */
export const appendMessageToOwnerLogs = async (
  owners: readonly MessageLogOwner[],
  append: (owner: MessageLogOwner) => Promise<RunPackageFileWriteResult | null>,
): Promise<RunPackageFileWriteResult<"communication_messages">> => {
  let durable = false;
  for (const owner of owners) {
    const result = await append(owner);
    if (!result || result.outcome === "committed") { durable = true; continue; }
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
