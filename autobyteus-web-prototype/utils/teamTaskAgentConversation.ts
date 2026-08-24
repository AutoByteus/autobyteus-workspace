import type { AgentContext } from '~/types/agent/AgentContext';

const getConversationMessages = (context: AgentContext | null): Array<{ type?: string; text?: string }> => {
  const conversation = context?.state?.conversation ?? context?.conversation;
  return Array.isArray(conversation?.messages) ? conversation.messages : [];
};

export const isTaskAgentWorkPacketText = (text: string | null | undefined): boolean => {
  const normalized = text?.trim() || '';
  return normalized.includes('You have been activated as task agent') ||
    normalized.includes('Task-agent run:') ||
    normalized.includes('current task-agent instance');
};

export const isTaskAgentOnlyConversation = (context: AgentContext | null): boolean => {
  const userMessages = getConversationMessages(context)
    .filter((message) => message.type === 'user');
  return userMessages.length > 0 &&
    userMessages.every((message) => isTaskAgentWorkPacketText(message.text));
};

export const hasConversationMessages = (context: AgentContext | null): boolean => (
  getConversationMessages(context).length > 0
);
