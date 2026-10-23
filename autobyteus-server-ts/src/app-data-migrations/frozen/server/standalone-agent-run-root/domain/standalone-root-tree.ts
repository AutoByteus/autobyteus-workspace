import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
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
