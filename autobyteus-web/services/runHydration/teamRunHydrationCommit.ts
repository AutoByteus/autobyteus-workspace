import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { TeamRunHydrationCandidate } from './teamRunContextHydrationService';
import { markTeamMemberProjectionAuthoritative } from './teamMemberProjectionHydrationService';

export const commitTeamRunHydrationActivities = (
  candidate: TeamRunHydrationCandidate,
): void => {
  const result = useAgentActivityStore().replaceProjectionActivitiesIfRevisions(
    candidate.activityReplacements,
  );
  if (result === 'conflict') {
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
