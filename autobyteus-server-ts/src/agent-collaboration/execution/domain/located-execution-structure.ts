import type { AgentTeamAddress } from "../../domain/agent-team-address.js";

/** How an execution entered its root's tree; shared by the team and org execution indexes. */
export type LocatedExecutionKind =
  | "configured"
  | "task"
  | "task_team_member"
  /** A collaborator Agent, or a collaborator Team (as a group), hosted by the root. */
  | "collaborator"
  /** A member of a collaborator Team. */
  | "collaborator_team_member";

/** One team (configured or task) on the path from a root to an agent execution; the root itself is never a group. */
export type LocatedExecutionGroup = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  executionKind: LocatedExecutionKind;
  startedAt: string | null;
}>;
