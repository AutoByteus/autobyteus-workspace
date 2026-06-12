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

  it('deduplicates projection rows when timestamped entries also appear with null timestamps', () => {
    const conversation = buildConversationFromProjection(
      'run-4',
      [
        {
          kind: 'message',
          role: 'user',
          content: 'You received a message from sender name: program_manager',
          ts: 100,
        },
        {
          kind: 'message',
          role: 'user',
          content: 'You received a message from sender name: program_manager',
          ts: null,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'FRONTEND_PARENT_TO_SUBTEAM',
          ts: 101,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'FRONTEND_PARENT_TO_SUBTEAM',
          ts: null,
        },
      ],
      {
        agentDefinitionId: 'agent-4',
        agentName: 'review_lead',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]).toMatchObject({
      type: 'user',
      text: 'You received a message from sender name: program_manager',
    });
    expect(conversation.messages[0]?.timestamp.toISOString()).toBe('1970-01-01T00:01:40.000Z');
    expect(conversation.messages[1]).toMatchObject({
      type: 'ai',
      text: 'FRONTEND_PARENT_TO_SUBTEAM',
    });
    expect(conversation.messages[1]?.timestamp.toISOString()).toBe('1970-01-01T00:01:41.000Z');
  });

  it('preserves repeated no-id no-timestamp projection rows', () => {
    const conversation = buildConversationFromProjection(
      'run-5',
      [
        {
          kind: 'message',
          role: 'user',
          content: 'repeat this',
          ts: null,
        },
        {
          kind: 'message',
          role: 'user',
          content: 'repeat this',
          ts: null,
        },
      ],
      {
        agentDefinitionId: 'agent-5',
        agentName: 'review_lead',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages.map((message) => ({
      type: message.type,
      text: message.type === 'user' ? message.text : message.text,
    }))).toEqual([
      { type: 'user', text: 'repeat this' },
      { type: 'user', text: 'repeat this' },
    ]);
  });

  it('ignores compaction projection entries while preserving ordered work trace replay', () => {
    const conversation = buildConversationFromProjection(
      'run-6',
      [
        {
          kind: 'message',
          role: 'user',
          content: 'start the task',
          ts: 200,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'I will call the tool.',
          ts: 201,
        },
        {
          kind: 'tool_call',
          invocationId: 'tool-6',
          toolName: 'read_file',
          toolArgs: { path: 'notes.md' },
          toolResult: { content: 'notes' },
          ts: 202,
        },
        {
          kind: 'compaction',
          content: 'Memory compacted',
          ts: 203,
        },
        {
          kind: 'reasoning',
          content: 'continue from the tool result',
          ts: 204,
        },
        {
          kind: 'message',
          role: 'assistant',
          content: 'Here is the final answer.',
          ts: 205,
        },
      ],
      {
        agentDefinitionId: 'agent-6',
        agentName: 'Agent',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]).toMatchObject({
      type: 'user',
      text: 'start the task',
    });
    if (conversation.messages[1]?.type !== 'ai') {
      throw new Error('expected AI message');
    }
    expect(conversation.messages[1].segments.map((segment) => segment.type)).toEqual([
      'text',
      'tool_call',
      'think',
      'text',
    ]);
    expect(conversation.messages[1].text).toContain('I will call the tool.');
    expect(conversation.messages[1].text).toContain('Here is the final answer.');
    expect(conversation.messages[1].text).not.toContain('Memory compacted');
  });

  it('hydrates user projection media into context file attachments from canonical media keys', () => {
    const imageLocator = '/rest/team-runs/team-1/members/solution_designer/context-files/ctx_abc__image.png';
    const audioLocator = 'local-file://opaque-audio-context';
    const videoLocator = 'local-file://opaque-video-context';

    const conversation = buildConversationFromProjection(
      'run-7',
      [
        {
          kind: 'message',
          role: 'user',
          content: 'inspect attached context',
          media: {
            images: [imageLocator],
            audio: [audioLocator],
            video: [videoLocator],
          },
          ts: 300,
        },
      ],
      {
        agentDefinitionId: 'agent-7',
        agentName: 'Agent',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(1);
    if (conversation.messages[0]?.type !== 'user') {
      throw new Error('expected user message');
    }
    expect(conversation.messages[0].contextFilePaths?.map((attachment) => ({
      locator: attachment.locator,
      type: attachment.type,
    }))).toEqual([
      { locator: imageLocator, type: 'Image' },
      { locator: audioLocator, type: 'Audio' },
      { locator: videoLocator, type: 'Video' },
    ]);
  });

  it('hydrates assistant media segments from canonical plural image media keys', () => {
    const imageLocator = '/rest/runs/run-8/context-files/ctx_abc__image.png';

    const conversation = buildConversationFromProjection(
      'run-8',
      [
        {
          kind: 'message',
          role: 'assistant',
          content: 'generated an image',
          media: {
            images: [imageLocator],
          },
          ts: 400,
        },
      ],
      {
        agentDefinitionId: 'agent-8',
        agentName: 'Agent',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    );

    expect(conversation.messages).toHaveLength(1);
    if (conversation.messages[0]?.type !== 'ai') {
      throw new Error('expected AI message');
    }
    expect(conversation.messages[0].segments).toContainEqual({
      type: 'media',
      mediaType: 'image',
      urls: [imageLocator],
    });
  });
});
