import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type {
  IsoTimestamp,
  RemoteTaskExecution,
  TaskExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

/** The standalone AgentRun that hosts an Agent root. Its own run data stays in `run_metadata.json`. */
export type StandaloneRootHost = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  agentDefinitionId: string;
}>;

/**
 * `memory/agents/<hostRunId>/collaboration/collaboration_tree.json`: created on the first
 * delegation. Read tolerantly, written exactly. Every task execution is hosted by the root and
 * carries the catalog source it was started from.
 */
export type StandaloneRootTreeFile = Readonly<{
  subjectKind: "agent";
  createdAt: IsoTimestamp;
  host: StandaloneRootHost;
  taskExecutions: readonly TaskExecution[];
  /**
   * In memory only: the remote runs the host delegated to (stored in `taskExecutions` with `nodeId`).
   * Absent when there are none, so a tree without remote links has exactly its stored shape.
   */
  remoteTaskExecutions?: readonly RemoteTaskExecution[];
}>;

export type StandaloneRootTreeSnapshot = StandaloneRootTreeFile;

/**
 * The host's messages in memory. On disk they are the host's `MessageLog` in
 * `memory/agents/<hostRunId>/collaboration/` (`communication_messages_*.jsonl`).
 */
export type StandaloneRootMessagesFile = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent";
  hostRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;

export const emptyStandaloneRootTree = (input: Readonly<{
  host: StandaloneRootHost;
  createdAt: IsoTimestamp;
}>): StandaloneRootTreeSnapshot => Object.freeze({
  subjectKind: "agent",
  createdAt: input.createdAt,
  host: Object.freeze({ ...input.host }),
  taskExecutions: Object.freeze([]),
});

export const emptyStandaloneRootMessages = (hostRunId: string): StandaloneRootMessagesFile =>
  Object.freeze({ schemaVersion: 1, subjectKind: "agent", hostRunId, messages: Object.freeze([]) });
