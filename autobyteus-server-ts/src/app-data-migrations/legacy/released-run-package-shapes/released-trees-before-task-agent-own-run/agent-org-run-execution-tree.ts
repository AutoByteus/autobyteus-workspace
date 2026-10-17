// Frozen verbatim copy (import paths remapped only) of `src/agent-org-execution/domain/agent-org-run-execution-tree.ts` as of the
// D-10 rename commit 8bbd081c8d (behavior identical to origin/personal@66429d6f31). Owned by
// released app-data migrations and `20261017_task_agent_own_run_v1`; current runtime must not import it.

import type { CollaborationHandoff } from "../../../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../../../agent-team-execution/domain/team-run-config.js";
import type {
  ConfiguredExecutionNode,
  IsoTimestamp,
  TaskExecution,
  TeamRunApplicationBinding,
} from "./run-execution-tree-shared-records.js";

export type RootConfiguredAgentOrgExecutionNode = Readonly<{
  address: "/";
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgRunId: string;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredExecutionNode[];
  taskExecutions: readonly TaskExecution[];
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
