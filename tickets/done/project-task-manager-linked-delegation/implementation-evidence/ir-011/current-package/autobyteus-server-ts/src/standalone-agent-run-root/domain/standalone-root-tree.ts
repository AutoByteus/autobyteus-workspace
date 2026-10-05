import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";
import type {
  CollaboratorEntry,
  IsoTimestamp,
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
 * admitted mention. Read tolerantly, written exactly. Every task execution is hosted by the
 * root and sits at a collaborator address.
 */
export type StandaloneRootTreeFile = Readonly<{
  subjectKind: "agent";
  createdAt: IsoTimestamp;
  host: StandaloneRootHost;
  collaborators: readonly CollaboratorEntry[];
  taskExecutions: readonly TaskExecution[];
}>;

export type StandaloneRootTreeSnapshot = StandaloneRootTreeFile;

/** `memory/agents/<hostRunId>/collaboration/communication_messages.json`. */
export type StandaloneRootMessagesFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent";
  hostRunId: string;
  messages: readonly CollaborationCommunicationMessageV1[];
}>;

export const emptyStandaloneRootTree = (input: Readonly<{
  host: StandaloneRootHost;
  createdAt: IsoTimestamp;
}>): StandaloneRootTreeSnapshot => Object.freeze({
  subjectKind: "agent",
  createdAt: input.createdAt,
  host: Object.freeze({ ...input.host }),
  collaborators: Object.freeze([]),
  taskExecutions: Object.freeze([]),
});

export const emptyStandaloneRootMessages = (hostRunId: string): StandaloneRootMessagesFileV1 =>
  Object.freeze({ schemaVersion: 1, subjectKind: "agent", hostRunId, messages: Object.freeze([]) });
