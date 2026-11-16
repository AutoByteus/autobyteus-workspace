import { memberDisplayName } from '~/utils/collaboration/memberDisplayName';
import type { TeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import type { CollaborationMessageMemberIdentity } from '~/types/workspace/collaborationMessagesContextView';

/** One of the Team's own members, as its Team tab names it (a run it delegated is named from its tree, SR-084). */
export const projectTeamCommunicationMemberIdentity = (
  view: TeamExecutionViewState, agentRunId: string,
): CollaborationMessageMemberIdentity => {
  const address = view.getMemberAddress(agentRunId);
  if (!address) throw new Error(`Team communication participant '${agentRunId}' is unavailable.`);
  // F-03: one display-name rule for tab senders in every root.
  return { address, label: memberDisplayName(address), kind: 'configured' };
};
