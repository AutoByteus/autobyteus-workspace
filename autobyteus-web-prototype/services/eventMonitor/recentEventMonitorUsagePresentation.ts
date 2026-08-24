import type { Conversation } from '~/types/conversation';
import type { RecentEventMonitorPresentationItem } from './recentEventMonitorWindow';

type ConversationMessage = Conversation['messages'][number];

export const getRecentEventMonitorMessageUsageText = (
  message: ConversationMessage,
): string => {
  if (message.type === 'user') {
    if (message.promptTokens != null && message.promptCost != null) {
      return `${message.promptTokens} tokens / $${message.promptCost.toFixed(4)}`;
    }
    return '';
  }
  if (message.completionTokens != null && message.completionCost != null) {
    return `${message.completionTokens} tokens / $${message.completionCost.toFixed(4)}`;
  }
  return '';
};

export const getRecentEventMonitorTotalUsageText = (
  items: readonly RecentEventMonitorPresentationItem[],
): string => {
  let totalTokens = 0;
  let totalCost = 0;
  for (const item of items) {
    if (item.kind !== 'message') continue;
    const message = item.message;
    if (message.type === 'user') {
      if (message.promptTokens) totalTokens += message.promptTokens;
      if (message.promptCost) totalCost += message.promptCost;
    } else {
      if (message.completionTokens) totalTokens += message.completionTokens;
      if (message.completionCost) totalCost += message.completionCost;
    }
  }
  return totalTokens > 0 ? `Total: ${totalTokens} tokens / $${totalCost.toFixed(4)}` : '';
};
