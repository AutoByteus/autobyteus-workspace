import { memberDisplayName } from '~/utils/collaboration/memberDisplayName';
import { findContainingTaskExecutionRunId } from '~/services/teamExecution/teamExecutionTreeSelectors';
import type { TeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import type { CollaborationMessageMemberIdentity } from '~/types/workspace/collaborationMessagesContextView';

export const projectTeamCommunicationMemberIdentity = (
  view: TeamExecutionViewState, agentRunId: string,
): CollaborationMessageMemberIdentity => {
  const address = view.getMemberAddress(agentRunId);
  if (!address) throw new Error(`Team communication participant '${agentRunId}' is unavailable.`);
  const executionRunId = findContainingTaskExecutionRunId(view.getExecutionTree(), agentRunId);
  // F-03: one display-name rule for tab senders in every root.
  const common = { address, label: memberDisplayName(address) };
  return executionRunId ? { ...common, kind: 'delegated',
    hostRunId: view.getAgentExecutionLocation(agentRunId)!.containingTeamRunId,
    executionRunId }
    : { ...common, kind: 'configured' };
};
