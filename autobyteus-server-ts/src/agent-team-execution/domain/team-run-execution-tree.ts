import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "./team-run-config.js";
import type {
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
  RemoteTaskExecution,
  TaskExecution,
  TeamRunApplicationBinding,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";

export type {
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TeamRunApplicationBinding,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

export type ConfiguredExecutionNode = ConfiguredAgentExecutionNode;

export type RootConfiguredTeamExecutionNode = Readonly<{
  address: "/";
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredAgentExecutionNode[];
  taskExecutions: readonly TaskExecution[];
  /**
   * In memory only: the remote runs this Team's agents delegated to (stored in `taskExecutions` with `nodeId`).
   * Absent when there are none, so a tree without remote links has exactly its stored shape.
   */
  remoteTaskExecutions?: readonly RemoteTaskExecution[];
}>;

/** Persisted TeamRun execution tree: read tolerantly, written exactly, no version field (REQ-018). */
export type TeamRunExecutionTreeFile = Readonly<{
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: TeamRunApplicationBinding | null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: RootConfiguredTeamExecutionNode;
  /**
   * Present only on a Team run a peer node started on this node (autobyteus-247): its back-link to the
   * delegating run there. Absent means the Team run was not started by a peer.
   */
  delegatedFrom?: DelegatedFrom;
}>;

export type TeamRunExecutionTreeSnapshot = TeamRunExecutionTreeFile;
