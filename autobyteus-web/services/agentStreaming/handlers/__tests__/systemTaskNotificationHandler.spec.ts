import { describe, expect, it } from 'vitest';
import { handleSystemTaskNotification } from '../systemTaskNotificationHandler';
import type { AgentContext } from '~/types/agent/AgentContext';

describe('handleSystemTaskNotification', () => {
  it('preserves SYSTEM_TASK_NOTIFICATION payload content as a system_task_notification segment', () => {
    const context = {
      state: { runId: 'agent-1' },
      conversation: {
        messages: [],
        updatedAt: '',
      },
    } as unknown as AgentContext;

    handleSystemTaskNotification(
      {
        sender_id: 'system_task_runner',
        content: 'You have a new task.\n\nTask ID: task_0001',
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
      },
    ]);
  });
});
