import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

describe('WorkingContext', () => {
  it('appends messages and complete tool protocol', () => {
    const context = new WorkingContext();
    context.appendUser('hello');
    context.appendAssistant('hi', 'reason');
    context.appendToolCalls([{ id: 'call-1', name: 'tool', arguments: { a: 1 } }], {
      content: 'I will call a tool.',
      reasoningContent: 'Tool result is needed.',
    });
    context.appendToolResult('call-1', 'tool', { ok: true });

    const messages = context.buildMessages();
    expect(messages.map(({ role }) => role)).toEqual([
      MessageRole.USER,
      MessageRole.ASSISTANT,
      MessageRole.ASSISTANT,
      MessageRole.TOOL,
    ]);
    expect(messages[2]?.tool_payload).toBeInstanceOf(ToolCallPayload);
    expect(messages[3]?.tool_payload).toBeInstanceOf(ToolResultPayload);
  });

  it('deeply detaches constructor, build, copy, append, and controlled replacement graphs', () => {
    const source = new Message(MessageRole.ASSISTANT, {
      content: 'tool request',
      image_urls: ['image://one'],
      audio_urls: ['audio://one'],
      video_urls: ['video://one'],
      metadata: { provenance: { rawTraceIds: ['rt-1'] } },
      tool_payload: new ToolCallPayload([{
        id: 'call-1',
        name: 'search',
        arguments: { query: { terms: ['alpha'] } },
        nativeToolCallContext: {
          provider: 'openai_responses',
          functionCallItem: { call_id: 'call-1', nested: { value: 1 } },
          responseOutputItems: [{ type: 'function_call', data: { ok: true } }],
        },
      }]),
    });
    const resultSource = new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload('call-1', 'search', {
        matches: [{ title: 'stable result' }],
      }),
    });
    const context = new WorkingContext([source, resultSource]);

    source.image_urls.push('image://caller-mutation');
    source.audio_urls.push('audio://caller-mutation');
    source.video_urls.push('video://caller-mutation');
    (source.metadata!.provenance as { rawTraceIds: string[] }).rawTraceIds.push('rt-caller');
    (((source.tool_payload as ToolCallPayload).toolCalls[0]!.arguments.query) as { terms: string[] })
      .terms.push('caller');
    ((resultSource.tool_payload as ToolResultPayload).toolResult.matches as Array<{ title: string }>)[0]!
      .title = 'caller mutation';

    const firstBuild = context.buildMessages();
    firstBuild[0]!.image_urls.push('image://build-mutation');
    ((firstBuild[0]!.metadata!.provenance as { rawTraceIds: string[] }).rawTraceIds).push('rt-build');
    const firstCall = (firstBuild[0]!.tool_payload as ToolCallPayload).toolCalls[0]!;
    ((firstCall.arguments.query as { terms: string[] }).terms).push('build');
    (firstCall.nativeToolCallContext as any).functionCallItem.nested.value = 99;
    ((firstBuild[1]!.tool_payload as ToolResultPayload).toolResult.matches as Array<{ title: string }>)[0]!
      .title = 'build mutation';

    const copied = context.copy();
    const copiedMessage = copied.buildMessages()[0]!;
    copiedMessage.video_urls.push('video://copy-build-mutation');

    expect(context.buildMessages()[0]).toMatchObject({
      image_urls: ['image://one'],
      audio_urls: ['audio://one'],
      video_urls: ['video://one'],
      metadata: { provenance: { rawTraceIds: ['rt-1'] } },
    });
    const stableCall = (context.buildMessages()[0]!.tool_payload as ToolCallPayload).toolCalls[0]!;
    expect((stableCall.arguments.query as { terms: string[] }).terms).toEqual(['alpha']);
    expect((stableCall.nativeToolCallContext as any).functionCallItem.nested.value).toBe(1);
    expect((context.buildMessages()[1]!.tool_payload as ToolResultPayload).toolResult).toEqual({
      matches: [{ title: 'stable result' }],
    });
    expect(copied.buildMessages()[0]!.video_urls).toEqual(['video://one']);

    const replacement = new Message(MessageRole.USER, { content: 'replacement', metadata: { nested: { n: 1 } } });
    context.replaceMessage(0, replacement);
    (replacement.metadata!.nested as { n: number }).n = 2;
    expect((context.buildMessages()[0]!.metadata!.nested as { n: number }).n).toBe(1);
    expect(() => context.replaceMessage(2, replacement)).toThrow(RangeError);
  });
});
