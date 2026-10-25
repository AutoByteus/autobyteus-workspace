import type { TeamRunHydrationCandidate } from './teamRunContextHydrationService';
import { markTeamMemberProjectionAuthoritative } from './teamMemberProjectionHydrationService';
import { commitMemberRunStates } from './memberRunStateHydration';
import { registerTeamRemoteRuns } from '~/services/teamExecution/teamRemoteRunRegistry';

/**
 * Commits every hydrated member's state (activities, then artifacts); throws when activity changed meanwhile. The
 * Team's remote runs join the window's registry (autobyteus-278).
 */
export const commitTeamRunHydration = (
  candidate: TeamRunHydrationCandidate,
): void => {
  if (commitMemberRunStates(candidate.memberRunStates) === 'conflict') {
    throw new Error(`Team activity for '${candidate.teamRunId}' changed before projection commit.`);
  }
  registerTeamRemoteRuns(candidate.teamRunId, candidate.remoteTaskExecutions);
};

export const markCommittedTeamRunHydrationAuthority = (
  candidate: TeamRunHydrationCandidate,
): void => {
  candidate.projectionByAgentRunId.forEach((projection, agentRunId) => {
    if (projection) markTeamMemberProjectionAuthoritative(candidate.hydratedContext, agentRunId);
  });
};
