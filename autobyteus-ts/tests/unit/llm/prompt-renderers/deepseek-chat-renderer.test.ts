import { describe, expect, it } from 'vitest';
import { DeepSeekChatRenderer } from '../../../../src/llm/prompt-renderers/deepseek-chat-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('DeepSeekChatRenderer', () => {
  it('emits reasoning_content for non-tool assistant messages', async () => {
    const rendered = await new DeepSeekChatRenderer().render([
      new Message(MessageRole.ASSISTANT, {
        content: 'The answer is 42.',
        reasoning_content: 'because'
      })
    ]) as any[];

    expect(rendered[0]).toMatchObject({
      role: 'assistant',
      content: 'The answer is 42.',
      reasoning_content: 'because'
    });
  });

  it('emits reasoning_content on assistant tool-call messages', async () => {
    const rendered = await new DeepSeekChatRenderer().render([
      new Message(MessageRole.ASSISTANT, {
        content: 'I will inspect the workspace.',
        reasoning_content: 'Need the current directory before answering.',
        tool_payload: new ToolCallPayload([
          { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } }
        ])
      })
    ]) as any[];

    expect(rendered[0]).toMatchObject({
      role: 'assistant',
      content: 'I will inspect the workspace.',
      reasoning_content: 'Need the current directory before answering.',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'run_bash',
            arguments: JSON.stringify({ command: 'pwd' })
          }
        }
      ]
    });
  });

  it('uses non-null reasoning presence and does not synthesize reasoning for non-assistant messages', async () => {
    const rendered = await new DeepSeekChatRenderer().render([
      new Message(MessageRole.ASSISTANT, {
        content: 'Empty reasoning is an explicit DeepSeek field.',
        reasoning_content: ''
      }),
      new Message(MessageRole.USER, {
        content: 'hello',
        reasoning_content: 'should not render on user'
      }),
      new Message(MessageRole.SYSTEM, {
        content: 'system',
        reasoning_content: 'should not render on system'
      }),
      new Message(MessageRole.TOOL, {
        reasoning_content: 'should not render on tool result',
        tool_payload: new ToolResultPayload('call_1', 'run_bash', 'ok')
      })
    ]) as any[];

    expect(rendered[0]).toHaveProperty('reasoning_content', '');
    expect(rendered[1]).not.toHaveProperty('reasoning_content');
    expect(rendered[2]).not.toHaveProperty('reasoning_content');
    expect(rendered[3]).not.toHaveProperty('reasoning_content');
  });
});
