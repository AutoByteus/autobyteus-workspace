import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  ConfiguredExecutionNode,
  IsoTimestamp,
  RemoteTaskAgentExecution,
  TaskExecution,
  TeamRunApplicationBinding,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

export type RootConfiguredAgentOrgExecutionNode = Readonly<{
  address: "/";
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgRunId: string;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredExecutionNode[];
  taskExecutions: readonly TaskExecution[];
  /** In memory only: the remote runs this Org's agents delegated to (stored in `taskExecutions` with `nodeId`). */
  remoteTaskExecutions: readonly RemoteTaskAgentExecution[];
}>;

/** Persisted AgentOrgRun execution tree: read tolerantly, written exactly, no version field (REQ-018). */
export type AgentOrgRunExecutionTreeFile = Readonly<{
  subjectKind: "agent_org";
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: TeamRunApplicationBinding | null;
  handoffs: readonly CollaborationHandoff[];
  rootOrg: RootConfiguredAgentOrgExecutionNode;
}>;

export type AgentOrgRunExecutionTreeSnapshot = AgentOrgRunExecutionTreeFile;
