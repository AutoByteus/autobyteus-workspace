import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView';
import { participantMessagesView } from '~/services/collaborationMessages/participantMessageRows';
import { participantMessagesKeyOf, teamAgentReadSubject } from '~/services/runHydration/agentReads';
import { projectTeamCommunicationMemberIdentity } from '~/utils/teamCommunication/teamCommunicationPerspective';

/**
 * A Team run's Team tab for its focused member: who each participant is, and the member's messages, loaded when
 * the tab is shown (autobyteus-358). The desktop Team tab and the mobile message screens use it.
 */
export const teamCollaborationMessagesView = (team: AgentTeamContext): CollaborationMessagesContextView => {
  const view = team.view;
  const entries = view.listAgentContextEntries();
  const focusedAgentRunId = view.getFocusedAgentRunId();
  return Object.freeze({
    rootKind: 'agent_team',
    rootRunId: view.getRootTeamRunId(),
    focusedAgentRunId,
    focusedMemberAddress: view.getFocusedMemberAddress(),
    memberIdentityByAgentRunId: () => Object.freeze(Object.fromEntries(entries.map((entry) => [
      entry.agentRunId,
      projectTeamCommunicationMemberIdentity(view, entry.agentRunId),
    ]))),
    // The focused agent's messages from the log of the run it is read through: a delegated child's own (CR-461-020).
    ...participantMessagesView({
      key: participantMessagesKeyOf(teamAgentReadSubject({ teamRunId: view.getRootTeamRunId(), tree: view.getExecutionTree(),
        memberAddress: view.getFocusedMemberAddress() }, focusedAgentRunId)),
      isRemote: view.isRemoteAgent(focusedAgentRunId),
      identityOf: (agentRunId) => view.getMemberAddress(agentRunId) ? projectTeamCommunicationMemberIdentity(view, agentRunId) : null,
    }),
  });
};
