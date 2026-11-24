import { describe, expect, it } from 'vitest';
import { handleSystemTaskNotification } from '../systemTaskNotificationHandler';
import type { AgentContext } from '~/types/agent/AgentContext';

const contextWith = (messages: unknown[] = []) => ({
  state: { runId: 'agent-1' },
  conversation: { messages, updatedAt: '' },
}) as unknown as AgentContext;
const notices = (context: AgentContext) => context.conversation.messages
  .flatMap((message) => (message.type === 'ai' ? message.segments : []))
  .filter((segment) => segment.type === 'system_task_notification');

describe('handleSystemTaskNotification', () => {
  it('preserves SYSTEM_TASK_NOTIFICATION payload content as a system_task_notification segment', () => {
    const context = contextWith();

    handleSystemTaskNotification(
      { occurred_at: '2026-11-23T16:55:09.697Z',
        sender_id: 'system_task_runner',
        content: 'You have a new task.\n\nTask ID: task_0001',
        message_id: null,
      },
      context,
    );

    expect(context.conversation.messages).toHaveLength(1);
    const aiMessage = context.conversation.messages[0] as any;
    expect(aiMessage.type).toBe('ai');
    expect(aiMessage.segments).toEqual([
      {
        type: 'system_task_notification',
        senderId: 'system_task_runner',
        content: 'You have a new task.\n\nTask ID: task_0001',
        messageId: null,
      },
    ]);
  });

  describe('a notice is shown once (autobyteus-526 SR-002)', () => {
    const reminder = { occurred_at: '2026-11-23T16:55:09.697Z', sender_id: 'system.restart_resume', content: '[Platform notice — application restarted]\n\n…', message_id: 'n1' };

    it('a frame whose notice the conversation already shows (a replayed or repeated frame) adds nothing', () => {
      const context = contextWith();
      expect(handleSystemTaskNotification(reminder, context)).toBe(true);
      expect(handleSystemTaskNotification(reminder, context)).toBe(false);
      expect(notices(context)).toEqual([expect.objectContaining({ messageId: 'n1' })]);
    });

    it('a snapshot\'s stored copy, even in an earlier, completed message, keeps the live frame out', () => {
      const context = contextWith([
        { type: 'ai', isComplete: true, text: '', timestamp: new Date(), segments: [
          { type: 'system_task_notification', senderId: 'system.restart_resume', content: reminder.content, messageId: 'n1' },
        ] },
        { type: 'user', text: 'Is the build done?', timestamp: new Date() },
      ]);
      expect(handleSystemTaskNotification(reminder, context)).toBe(false);
      expect(notices(context)).toHaveLength(1);
      expect(context.conversation.messages).toHaveLength(2);
    });

    it('another notice id is shown; notices without an id (older history) are each shown as they come', () => {
      const context = contextWith();
      handleSystemTaskNotification(reminder, context);
      handleSystemTaskNotification({ ...reminder, message_id: 'n2' }, context);
      handleSystemTaskNotification({ ...reminder, message_id: null }, context);
      handleSystemTaskNotification({ ...reminder, message_id: null }, context);
      expect(notices(context).map((segment) => segment.messageId)).toEqual(['n1', 'n2', null, null]);
    });
  });
});
