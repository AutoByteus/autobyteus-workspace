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
 * How a committed Team build leaves the Team tab's lists (autobyteus-358, SR-005): a build read without a stream
 * (open, restore, launch) names no live sequence, so its lists load again; a stream recovery's candidate stream
 * already applied its snapshot, which rebuilt them with its live sequence.
 */
export type TeamBuildMessages = 'stored_rebuild' | 'rebuilt_by_stream_snapshot';

/**
 * The committed Team context is a new build (open or stream recovery, autobyteus-358): it begins a member-loader
 * generation in which only the staged (focused) member is loaded.
 */
export const markCommittedTeamRunHydrationAuthority = (
  candidate: TeamRunHydrationCandidate,
  messages: TeamBuildMessages,
): void => {
  beginTeamMemberGeneration(candidate.hydratedContext);
  candidate.projectionByAgentRunId.forEach((projection, agentRunId) => {
    if (projection) markTeamMemberProjectionAuthoritative(candidate.hydratedContext, agentRunId);
  });
  if (messages === 'stored_rebuild') {
    useCollaborationParticipantMessagesStore().reloadRoot('agent_team', candidate.teamRunId, { liveSequenceId: null, baseChangeSequence: 0 });
  }
};
