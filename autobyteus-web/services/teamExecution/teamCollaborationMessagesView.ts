import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView';
import { participantMessagesView } from '~/services/collaborationMessages/participantMessageRows';
import { projectTeamCommunicationMemberIdentity } from '~/utils/teamCommunication/teamCommunicationPerspective';
import { delegatedRunMessagesKey, type DelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects';
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { treeAgentIdentity } from '~/utils/runTree/runTreeAgents';

/** A run the Team delegated, selected in its tree: opened as its own run, its Team tab reads its own run's log (rule 2). */
export type TeamDelegatedFocus = Readonly<{ subject: DelegatedRunSubject; address: string; agentRunId: string }>;

/**
 * A Team run's Team tab for its focused member, or for a run it delegated that is selected in its tree: who each
 * participant is (its own members, or an agent of a run in its tree), and the messages, loaded when the tab is shown
 * (autobyteus-358). The desktop Team tab and the mobile message screens use it.
 */
export const teamCollaborationMessagesView = (team: AgentTeamContext, delegated: TeamDelegatedFocus | null = null): CollaborationMessagesContextView => {
  const view = team.view;
  const rootRunId = view.getRootTeamRunId();
  const entries = view.listAgentContextEntries();
  const focusedAgentRunId = delegated?.agentRunId ?? view.getFocusedAgentRunId();
  const identityOf = (agentRunId: string) => view.getMemberAddress(agentRunId)
    ? projectTeamCommunicationMemberIdentity(view, agentRunId)
    : treeAgentIdentity(useRunTreeStore().rowsOf({ kind: 'agent_team', runId: rootRunId }), agentRunId, rootRunId);
  return Object.freeze({
    rootKind: 'agent_team',
    rootRunId,
    focusedAgentRunId,
    focusedMemberAddress: delegated ? parseAgentTeamAddress(delegated.address) : view.getFocusedMemberAddress(),
    memberIdentityByAgentRunId: () => Object.freeze(Object.fromEntries(entries.map((entry) => [
      entry.agentRunId,
      projectTeamCommunicationMemberIdentity(view, entry.agentRunId),
    ]))),
    ...participantMessagesView({
      // A delegated run's messages are in its own run's log (autobyteus-461 rule 2; CR-461-020).
      key: delegated ? delegatedRunMessagesKey(delegated.subject) : { rootKind: 'agent_team', rootRunId, agentRunId: focusedAgentRunId },
      isRemote: false,
      identityOf,
    }),
  });
};
