// Frozen verbatim copy (import paths remapped only) of `src/agent-team-execution/domain/team-run-execution-tree.ts` as of the
// D-10 rename commit 8bbd081c8d (behavior identical to origin/personal@66429d6f31). Owned by
// released app-data migrations and `20261017_task_agent_own_run_v1`; current runtime must not import it.

import type { AgentTeamAddress } from "../../server/agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../server/agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../server/agent-team-execution/domain/team-run-config.js";
import type {
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
  TaskExecution,
  TeamRunApplicationBinding,
} from "./run-execution-tree-shared-records.js";

export type {
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TeamRunApplicationBinding,
} from "./run-execution-tree-shared-records.js";

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
