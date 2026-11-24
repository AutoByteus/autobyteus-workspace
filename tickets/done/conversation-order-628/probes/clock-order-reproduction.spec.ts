// Reproduction for autobyteus-628: a viewer whose clock is behind the node's shows its own message
// after the agent's reply. Real web code: the live handlers and the conversation window.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { handleSystemTaskNotification } from '~/services/agentStreaming/handlers/systemTaskNotificationHandler';
import { handleMemberInputMessage } from '~/services/agentStreaming/handlers/memberInputMessageHandler';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';
import type { AgentContext } from '~/types/agent/AgentContext';

const NODE_RECEIVED = '2026-11-23T16:55:09.696Z';
const run = (phoneBehindNodeMs: number) => {
  setActivePinia(createPinia());
  const context = { state: { runId: 'r' }, conversation: { messages: [
    { type: 'ai', text: 'please confirm', timestamp: new Date('2026-11-23T16:54:00Z'), isComplete: true,
      segments: [{ type: 'text', content: 'please confirm: go back to ACP?' }] },
  ], updatedAt: '' } } as unknown as AgentContext;
  // The phone's own send, shown at once (its clock).
  vi.setSystemTime(new Date(Date.parse(NODE_RECEIVED) - phoneBehindNodeMs));
  context.conversation.messages.push({ type: 'user', text: 'You mean …?', timestamp: new Date(), messageId: 'client_b', contextFilePaths: [] } as never);
  // The node's echo of it (node clock).
  handleMemberInputMessage({ message_id: 'client_b', dedupe_key: 'member_input:x', content: 'You mean …?', input_origin: 'user_message',
    received_at: NODE_RECEIVED, context_file_paths: [] } as never, context);
  // 300 ms later (node time) the notice and the reply arrive; the phone stamps the new AI message with its own clock.
  vi.setSystemTime(new Date(Date.parse(NODE_RECEIVED) + 300 - phoneBehindNodeMs));
  handleSystemTaskNotification({ sender_id: 'system.skill_update_notifier', content: '[Platform notice — skill updated]', message_id: 'n1' }, context);
  const ai = context.conversation.messages.at(-1) as any;
  ai.segments.push({ type: 'text', content: 'My recommendation stands. Shall I?' });
  return buildRecentEventMonitorPresentation(context.conversation, []).map((item: any) =>
    item.kind === 'notice' ? 'notice' : item.message.type === 'user' ? 'You' : `agent:${item.message.segments.map((s: any) => s.content).join('|').slice(0, 24)}`);
};

describe('autobyteus-628 reproduction', () => {
  afterEach(() => vi.useRealTimers());
  it('same clock: your message before the notice and reply', () => {
    vi.useFakeTimers();
    expect(run(0)).toEqual(['agent:please confirm: go back ', 'You', 'notice', 'agent:My recommendation stands']);
  });
  it('phone 1 s behind the node: your message after the reply (the founder\'s screenshots)', () => {
    vi.useFakeTimers();
    expect(run(1000)).toEqual(['agent:please confirm: go back ', 'You', 'notice', 'agent:My recommendation stands']);
  });
});
