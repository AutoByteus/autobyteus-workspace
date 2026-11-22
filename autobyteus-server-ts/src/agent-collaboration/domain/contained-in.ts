import type { AgentTeamAddress } from "./agent-team-address.js";

/**
 * A unit run's fixed back-link to the Org container it belongs to (org-teams-follow-definition, GLOSSARY): the Org run
 * and the unit's address in the Org (a direct Org agent's, `/concierge`, or a mounted Team's, `/software_engineering_team`).
 * Written once when the unit run is created; never edited. Absent: a run of its own outside any Org.
 */
export type ContainedIn = Readonly<{ orgRunId: string; address: AgentTeamAddress }>;

/** Whether two runs are units of the same Org container (the one rule; the container directory answers it, N-1). */
export const sameContainerOf = (a: ContainedIn | null | undefined, b: ContainedIn | null | undefined): boolean =>
  Boolean(a && b && a.orgRunId === b.orgRunId);
