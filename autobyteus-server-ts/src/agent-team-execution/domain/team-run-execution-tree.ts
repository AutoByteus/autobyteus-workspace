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
import type { ContainedIn } from "../../agent-collaboration/domain/contained-in.js";

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
  /**
   * Former members: members removed from the Team definition while the run existed, kept with their run IDs for the
   * run's history; not addressable; a member the definition adds again comes back from here. Absent: none.
   */
  formerMembers?: readonly FormerMemberExecutionNode[];
}>;

/**
 * A former member. `leaving: true` (SR-010): it was removed with a live execution that has not stopped yet; it reads as
 * leaving only while the team run is live (otherwise, as former). Written by the committing plan, cleared by the release
 * write when it stops and by any later plan that finds its execution no longer live (a restore always does).
 */
export type FormerMemberExecutionNode = ConfiguredAgentExecutionNode & Readonly<{ leaving?: true }>;

/** What a delegated Team run was copied from, recorded once at its creation: only a Team definition's copy follows it. */
export type TeamRunCopiedFrom = "team_definition" | "configured_placement";

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
  /** A delegated Team run's origin, written once when it is created (absent: a standalone run, or an older copy). */
  copiedFrom?: TeamRunCopiedFrom;
  /**
   * A Team mounted in an Org: its Org container and its address there, written once when it is created. Its tree stays
   * in team space (members at `/x`); the address boundary presents them as `<address>/x` (design R-1''). Absent: a Team
   * run outside any Org.
   */
  containedIn?: ContainedIn;
}>;

export type TeamRunExecutionTreeSnapshot = TeamRunExecutionTreeFile;
