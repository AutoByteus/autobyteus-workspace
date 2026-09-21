import { agentIdsInTaskTeam } from '~/utils/teamDelegatedTaskEntries';
import type { TeamCommunicationMessageDto } from '@autobyteus/team-stream-contracts';
import type { TeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import type {
  CollaborationMessagePerspectiveRow,
  CollaborationMessageMemberIdentity,
  CollaborationMessagesPerspective,
} from '~/types/workspace/collaborationMessagesContextView';
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress';

const compareDesc = (left: CollaborationMessagePerspectiveRow, right: CollaborationMessagePerspectiveRow): number =>
  right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId);

export const projectTeamCommunicationPerspective = (input: {
  view: TeamExecutionViewState;
  messages: readonly TeamCommunicationMessageDto[];
  focusedAgentRunId: string;
}): CollaborationMessagesPerspective => {
  const focusedAgentRunId = input.focusedAgentRunId.trim();
  if (!focusedAgentRunId || !input.view.hasAgentRun(focusedAgentRunId)) return { messages: [] };
  const messages = input.messages.flatMap((message): CollaborationMessagePerspectiveRow[] => {
    const sent = message.sender_agent_run_id === focusedAgentRunId;
    const received = message.receiver_agent_run_id === focusedAgentRunId;
    if (!sent && !received) return [];
    const counterpartAgentRunId = sent ? message.receiver_agent_run_id : message.sender_agent_run_id;
    const counterpartAddress = input.view.getMemberAddress(counterpartAgentRunId);
    if (!counterpartAddress) return [];
    return [{
      messageId: message.message_id,
      senderAgentRunId: message.sender_agent_run_id,
      receiverAgentRunId: message.receiver_agent_run_id,
      content: message.content,
      messageType: message.message_type,
      createdAt: message.created_at,
      referenceFiles: message.reference_files.map((reference) => ({
        referenceId: reference.reference_id,
        path: reference.path,
        type: reference.type,
        createdAt: reference.created_at,
        updatedAt: reference.updated_at,
      })),
      direction: sent ? 'sent' : 'received',
      counterpartAgentRunId,
      counterpart: projectTeamCommunicationMemberIdentity(input.view, counterpartAgentRunId),
    }];
  }).sort(compareDesc);
  return { messages };
};

export const projectTeamCommunicationMemberIdentity = (
  view: TeamExecutionViewState, agentRunId: string,
): CollaborationMessageMemberIdentity => {
  const address = view.getMemberAddress(agentRunId);
  if (!address) throw new Error(`Team communication participant '${agentRunId}' is unavailable.`);
  const assigned = view.listTaskHistoryRows().find((task) => task.targetAgentRunId === agentRunId
    || (task.targetTeamRunId && agentIdsInTaskTeam(view.getExecutionTree(), task.targetTeamRunId).has(agentRunId)));
  const common = { address, label: memberAddressBasename(address) };
  return assigned ? { ...common, kind: 'task', taskId: assigned.task.task_id,
    hostRunId: view.getAgentExecutionLocation(agentRunId)!.containingTeamRunId,
    executionRunId: (assigned.targetAgentRunId ?? assigned.targetTeamRunId)! }
    : { ...common, kind: 'configured' };
};
