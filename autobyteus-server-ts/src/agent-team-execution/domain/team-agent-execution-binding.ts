import {
  createCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/** Exact correlated identity for every configured, task-Agent, and task-Team Agent event. */
export type TeamAgentExecutionBinding = CollaborationMemberExecutionIdentity;

export const createTeamAgentExecutionBinding = (
  identity: CollaborationMemberExecutionIdentity,
): TeamAgentExecutionBinding => createCollaborationMemberExecutionIdentity(identity);
