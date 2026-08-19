import {
  createTeamMemberExecutionIdentity,
  type TeamMemberExecutionIdentity,
} from "./team-member-execution-identity.js";

/** Exact correlated identity for every configured, task-Agent, and task-Team Agent event. */
export type TeamAgentExecutionBinding = TeamMemberExecutionIdentity;

export const createTeamAgentExecutionBinding = (
  identity: TeamMemberExecutionIdentity,
): TeamAgentExecutionBinding => createTeamMemberExecutionIdentity(identity);
