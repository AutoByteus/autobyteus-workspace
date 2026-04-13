import { describe, expect, it } from 'vitest';
import { buildConversationFromProjection } from '../runProjectionConversation';

describe('runProjectionConversation', () => {
  it('groups adjacent assistant-side replay entries into one AI message with ordered segments', () => {
    const conversation = buildConversationFromProjection(
      'run-1',
      [
        {
          kind: 'message',
          role: 'user',
          content: 'build the script',
          ts: 1,
        },
        {
          kind: 'reasoning',
          content: 'planning the shell command',
          ts: 2,
        },
        {
          kind: 'tool_call',
          invocationId: 'tool-1',
          toolName: 'run_bash',
          toolArgs: { command: 'pwd' },
          toolResult: { output: '/tmp/workspace\n' },
          ts: 3,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'done',
          ts: 4,
        },
      ],
      {
        agentDefinitionId: 'agent-1',
        agentName: 'Agent',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]).toMatchObject({
      type: 'user',
      text: 'build the script',
    });
    expect(conversation.messages[1]).toMatchObject({
      type: 'ai',
      text: 'done',
      reasoning: 'planning the shell command',
      isComplete: true,
    });
    if (conversation.messages[1]?.type !== 'ai') {
      throw new Error('expected AI message');
    }
    expect(conversation.messages[1].timestamp.toISOString()).toBe('1970-01-01T00:00:02.000Z');
    expect(conversation.messages[1].segments).toEqual([
      {
        type: 'think',
        content: 'planning the shell command',
      },
      expect.objectContaining({
        type: 'tool_call',
        invocationId: 'tool-1',
        toolName: 'run_bash',
        arguments: { command: 'pwd' },
        status: 'success',
        result: { output: '/tmp/workspace\n' },
      }),
      {
        type: 'text',
        content: 'done',
      },
    ]);
  });

  it('does not fabricate think segments when the replay source has no reasoning entry', () => {
    const conversation = buildConversationFromProjection(
      'run-2',
      [
        {
          kind: 'message',
          role: 'user',
          content: 'run the command',
          ts: 10,
        },
        {
          kind: 'tool_call',
          invocationId: 'tool-2',
          toolName: 'run_bash',
          toolArgs: { command: 'ls' },
          toolResult: { output: 'a.txt\n' },
          ts: 11,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'listed the directory',
          ts: 12,
        },
      ],
      {
        agentDefinitionId: 'agent-2',
        agentName: 'Agent',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(2);
    if (conversation.messages[1]?.type !== 'ai') {
      throw new Error('expected AI message');
    }
    expect(conversation.messages[1].reasoning).toBeNull();
    expect(conversation.messages[1].segments.map((segment) => segment.type)).toEqual([
      'tool_call',
      'text',
    ]);
  });

  it('flushes the pending AI message when a new user boundary appears', () => {
    const conversation = buildConversationFromProjection(
      'run-3',
      [
        {
          kind: 'message',
          role: 'user',
          content: 'first',
          ts: 20,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'answer one',
          ts: 21,
        },
        {
          kind: 'message',
          role: 'user',
          content: 'second',
          ts: 22,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'answer two',
          ts: 23,
        },
      ],
      {
        agentDefinitionId: 'agent-3',
        agentName: 'Agent',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(4);
    expect(conversation.messages.map((message) => message.type)).toEqual([
      'user',
      'ai',
      'user',
      'ai',
    ]);
    expect(conversation.messages[1]).toMatchObject({
      type: 'ai',
      text: 'answer one',
    });
    expect(conversation.messages[3]).toMatchObject({
      type: 'ai',
      text: 'answer two',
    });
  });
});
