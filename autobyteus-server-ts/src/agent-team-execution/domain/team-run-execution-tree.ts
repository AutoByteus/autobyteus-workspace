import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "./team-run-config.js";
import type {
  CollaboratorEntry,
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
  TaskExecution,
  TeamRunApplicationBinding,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

export type {
  CollaboratorAgentEntry,
  CollaboratorEntry,
  CollaboratorTeamEntry,
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
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
  /** Shared definitions brought into this run with `@`; no run IDs (runs stay in `taskExecutions`). */
  collaborators: readonly CollaboratorEntry[];
  taskExecutions: readonly TaskExecution[];
}>;

/** Persisted TeamRun execution tree: read tolerantly, written exactly, no version field (REQ-018). */
export type TeamRunExecutionTreeFile = Readonly<{
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: TeamRunApplicationBinding | null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: RootConfiguredTeamExecutionNode;
}>;

export type TeamRunExecutionTreeSnapshot = TeamRunExecutionTreeFile;
