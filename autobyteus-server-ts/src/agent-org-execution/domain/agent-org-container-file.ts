import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { IsoTimestamp, TeamRunApplicationBinding } from "../../run-history/domain/run-execution-tree-shared-records.js";

/** What a unit of an Org is: a direct Org agent (an agent run) or a mounted Team (a Team run). */
export type AgentOrgUnitKind = "agent" | "agent_team";

/**
 * One unit of an Org container (org-teams-follow-definition): its Org address, its kind, the run that is the unit
 * (`agents/<runId>/` or `agent_teams/<runId>/`, carrying `containedIn` back to the container) and its definition.
 */
export type AgentOrgUnit = Readonly<{
  address: AgentTeamAddress;
  kind: AgentOrgUnitKind;
  runId: string;
  definitionId: string;
  /**
   * A former unit removed while it was working (REQ-009, as autobyteus-22's leaving member): it finishes, then stops; the
   * marker is cleared once it stopped, and reads as former outside a live Org (nothing runs there).
   */
  leaving?: true;
}>;

export type AgentOrgContainerRoot = Readonly<{
  address: "/";
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgRunId: string;
  /** The Org's own launch (the launch page's root row); each unit keeps its own launch in its run. */
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  units: readonly AgentOrgUnit[];
  /** Units removed by an Org definition change, kept for history (like a Team's former members). */
  formerUnits: readonly AgentOrgUnit[];
}>;

/**
 * An Org run after org-teams-follow-definition: a container of runs (`agent_orgs/<orgRunId>/agent_org_run_execution_tree.json`).
 * It hosts no agent execution and has no message log: its units are runs of their own. It keeps the Org definition's
 * reference, its own launch, its units, its former units and the Org-level rules (the Org definition's rules, not those
 * wholly inside one mounted Team, which that Team's run keeps). Read tolerantly, written exactly, no version field.
 */
export type AgentOrgContainerFile = Readonly<{
  subjectKind: "agent_org";
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: TeamRunApplicationBinding | null;
  /** The Org-level rules, in Org addresses. */
  handoffs: readonly CollaborationHandoff[];
  rootOrg: AgentOrgContainerRoot;
}>;

/** Whether a stored Org file is a container (it has `rootOrg.units`) rather than a released Org tree v1. */
export const isAgentOrgContainerPayload = (value: unknown): boolean => {
  const root = (value as { rootOrg?: unknown } | null)?.rootOrg as { units?: unknown } | undefined;
  return Array.isArray(root?.units);
};
