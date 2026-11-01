import type { TeamRunHydrationCandidate } from './teamRunContextHydrationService';
import { beginTeamMemberGeneration, markTeamMemberProjectionAuthoritative } from './teamMemberProjectionHydrationService';
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages';
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

/**
 * The committed Team context is a new build (open or stream recovery, autobyteus-358): it begins a member-loader
 * generation in which only the staged (focused) member is loaded, and the Team tab's message lists load again.
 */
export const markCommittedTeamRunHydrationAuthority = (
  candidate: TeamRunHydrationCandidate,
): void => {
  beginTeamMemberGeneration(candidate.hydratedContext);
  candidate.projectionByAgentRunId.forEach((projection, agentRunId) => {
    if (projection) markTeamMemberProjectionAuthoritative(candidate.hydratedContext, agentRunId);
  });
  useCollaborationParticipantMessagesStore().reloadRoot('agent_team', candidate.teamRunId);
};
