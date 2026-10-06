import type { TeamRunHydrationCandidate } from './teamRunContextHydrationService';
import { markTeamMemberProjectionAuthoritative } from './teamMemberProjectionHydrationService';
import { commitMemberRunStates } from './memberRunStateHydration';

/** Commits every hydrated member's state (activities, then artifacts); throws when activity changed meanwhile. */
export const commitTeamRunHydration = (
  candidate: TeamRunHydrationCandidate,
): void => {
  if (commitMemberRunStates(candidate.memberRunStates) === 'conflict') {
    throw new Error(`Team activity for '${candidate.teamRunId}' changed before projection commit.`);
  }
};

export const markCommittedTeamRunHydrationAuthority = (
  candidate: TeamRunHydrationCandidate,
): void => {
  candidate.projectionByAgentRunId.forEach((projection, agentRunId) => {
    if (projection) markTeamMemberProjectionAuthoritative(candidate.hydratedContext, agentRunId);
  });
};
