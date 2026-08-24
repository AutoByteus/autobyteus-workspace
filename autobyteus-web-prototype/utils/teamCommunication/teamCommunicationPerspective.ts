import type { TeamCommunicationMessageDto } from '@autobyteus/team-stream-contracts';
import type { TeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import type {
  TeamCommunicationPerspective,
  TeamCommunicationPerspectiveMessage,
} from '~/stores/teamCommunicationTypes';
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress';

const compareDesc = (left: TeamCommunicationPerspectiveMessage, right: TeamCommunicationPerspectiveMessage): number =>
  right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId);

export const projectTeamCommunicationPerspective = (input: {
  view: TeamExecutionViewState;
  messages: readonly TeamCommunicationMessageDto[];
  focusedAgentRunId: string;
}): TeamCommunicationPerspective => {
  const focusedAgentRunId = input.focusedAgentRunId.trim();
  if (!focusedAgentRunId || !input.view.hasAgentRun(focusedAgentRunId)) return { messages: [] };
  const messages = input.messages.flatMap((message): TeamCommunicationPerspectiveMessage[] => {
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
      counterpartLabel: memberAddressBasename(counterpartAddress),
      message,
    }];
  }).sort(compareDesc);
  return { messages };
};
