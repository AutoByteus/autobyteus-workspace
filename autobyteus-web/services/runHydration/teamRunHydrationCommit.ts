import type { TeamRunHydrationCandidate } from './teamRunContextHydrationService';
import { beginTeamMemberGeneration, markTeamMemberProjectionAuthoritative } from './teamMemberProjectionHydrationService';
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages';
import { commitMemberRunStates } from './memberRunStateHydration';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { treeRowOfAgent } from '~/utils/runTree/runTreeAgents';

/** Commits every hydrated member's state (activities, then artifacts); throws when activity changed meanwhile. */
export const commitTeamRunHydration = (
  candidate: TeamRunHydrationCandidate,
): void => {
  if (commitMemberRunStates(candidate.memberRunStates) === 'conflict') {
    throw new Error(`Team activity for '${candidate.teamRunId}' changed before projection commit.`);
  }
};

/**
 * The committed Team context is a new build (open, restore, launch or stream recovery, autobyteus-358): it begins a
 * member-loader generation in which only the staged (focused) member is loaded. Its read names the running Team's live
 * sequence and base (SR-006), so the Team tab's lists reload only when a message could have been missed; a stopped
 * Team's read names none, so they reload.
 */
export const markCommittedTeamRunHydrationAuthority = (
  candidate: TeamRunHydrationCandidate,
): void => {
  beginTeamMemberGeneration(candidate.hydratedContext);
  candidate.projectionByAgentRunId.forEach((projection, agentRunId) => {
    if (projection) markTeamMemberProjectionAuthoritative(candidate.hydratedContext, agentRunId);
  });
  // The Team holds its own members and the agents of the runs in its tree (SR-084).
  useCollaborationParticipantMessagesStore().reloadRoot('agent_team', candidate.teamRunId, candidate.rebuild,
    (agentRunId) => candidate.hydratedContext.view.getMemberAddress(agentRunId) !== null
      || treeRowOfAgent(useRunTreeStore().rowsOf({ kind: 'agent_team', runId: candidate.teamRunId }), agentRunId) !== null);
};
