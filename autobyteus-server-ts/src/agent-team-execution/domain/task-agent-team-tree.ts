import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { AgentLaunchConfiguration } from "./team-run-config.js";
import type { IsoTimestamp, UserLaunchSelection } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TaskAgentSection } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * One member of a task agent team's own tree (contract §3.2, U-3): its definition and run, plus the
 * launch fields present only when recorded (an absent `launchConfiguration` means the member follows
 * the team default).
 */
export type TaskAgentTeamMemberNode = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  role: null;
  description: null;
  launchConfiguration?: AgentLaunchConfiguration;
  launchSource?: LaunchConfigurationSource;
  userLaunchSelection?: UserLaunchSelection;
}>;

/**
 * The root of a task agent team's own tree: today's team tree root without `teamDefinitionName` (not
 * recorded for a task team). `address` is the address the delegation used and the members keep their
 * addresses as recorded; `taskExecutions` is always empty: task agents its members create are linked by
 * the coordinating run (CM-7, U-5).
 */
export type TaskAgentTeamRootNode = Readonly<{
  address: AgentTeamAddress;
  teamDefinitionId: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly TaskAgentTeamMemberNode[];
  taskExecutions: readonly [];
}>;

/** A task agent team's own `team_run_execution_tree.json` at `agent_teams/<teamRunId>/` (contract §3.2). */
export type TaskAgentTeamTreeFile = Readonly<{
  createdAt: IsoTimestamp;
  archivedAt: null;
  applicationBinding: null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: TaskAgentTeamRootNode;
  taskAgent: TaskAgentSection;
}>;
