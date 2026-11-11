import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "./team-run-config.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type {
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
  TeamRunApplicationBinding,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";

export type {
  ConfiguredAgentExecutionNode,
  IsoTimestamp,
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
  /** How the team's default launch was resolved, when recorded (a delegated team, DS-10 step 4). */
  defaultLaunchSource?: LaunchConfigurationSource;
  members: readonly ConfiguredAgentExecutionNode[];
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
