import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  ConfiguredExecutionNode,
  IsoTimestamp,
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
}>;

export type AgentOrgRunExecutionTreeFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: TeamRunApplicationBinding | null;
  handoffs: readonly CollaborationHandoff[];
  rootOrg: RootConfiguredAgentOrgExecutionNode;
}>;

export type AgentOrgRunExecutionTreeSnapshot = AgentOrgRunExecutionTreeFileV1;
