import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  CollaboratorEntry,
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
  /** Shared definitions brought into this run with `@`; no run IDs (runs stay in `taskExecutions`). */
  collaborators: readonly CollaboratorEntry[];
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
