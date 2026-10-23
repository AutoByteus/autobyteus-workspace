// Frozen verbatim copy (import paths remapped only) of `src/agent-org-execution/domain/agent-org-run-execution-tree.ts` as released at
// origin/personal@f2924a2b0. Owned by released app-data migrations; current runtime must not import it.
import type { CollaborationHandoff } from "../../../frozen/server/agent-collaboration/domain/collaboration-handoff.js";
import type { ReleasedAgentLaunchConfiguration } from "../../../frozen/released-team-run-config.js";
import type {
  ConfiguredExecutionNode,
  IsoTimestamp,
  TaskExecution,
  TeamRunApplicationBinding,
} from "../../../frozen/released-run-package-shapes/run-execution-tree-shared-records-v2.js";

export type RootConfiguredAgentOrgExecutionNode = Readonly<{
  address: "/";
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgRunId: string;
  defaultLaunchConfiguration: ReleasedAgentLaunchConfiguration;
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
