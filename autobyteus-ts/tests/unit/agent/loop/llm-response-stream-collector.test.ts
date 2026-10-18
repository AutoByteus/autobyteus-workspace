import { describe, expect, it, vi } from 'vitest';
import { LlmResponseStreamCollector } from '../../../../src/agent/loop/llm-response-stream-collector.js';
import { TurnExecutionScope } from '../../../../src/agent/interruption/turn-execution-scope.js';
import { isAgentInterruptionError } from '../../../../src/agent/interruption/agent-interruption.js';
import { ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { buildFinish } from '../../../../src/llm/utils/llm-response-finish.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';

const TURN = 'turn_0001';
const usage = buildLlmTokenUsageObservation({ inputTokens: 10, outputTokens: 5, totalTokens: 15, rawUsage: null });

const setup = (toolCallsEnabled = true) => {
  const events: any[] = [];
  const notifier = { notifyAgentSegmentEvent: vi.fn((event: any) => events.push(event)) } as any;
  const collector = new LlmResponseStreamCollector({ turnId: TURN, notifier, toolCallsEnabled });
  return { collector, events, scope: new TurnExecutionScope(TURN) };
};

async function* stream(...chunks: ChunkResponse[]) { for (const chunk of chunks) yield chunk; }

const reasoningEvents = (events: any[]) => events.filter((event) => String(event.segment_id).includes(':reasoning_'));

describe('LlmResponseStreamCollector', () => {
  it('accumulates text, reasoning, usage, finish, media and the native turn; builds the normal response', async () => {
    const { collector, scope } = setup();
    const nativeTurn = { provider: 'anthropic', blocks: [] } as any;
    await collector.consume(stream(
      new ChunkResponse({ content: '', reasoning: 'think ' }),
      new ChunkResponse({ content: '', reasoning: 'more' }),
      new ChunkResponse({ content: 'Hello' }),
      new ChunkResponse({ content: '', providerNativeAssistantTurn: nativeTurn }),
      new ChunkResponse({ content: '', is_complete: true, usage, finish: buildFinish('stop', 'stop'), image_urls: ['a.png'] }),
    ), scope);

    expect(collector.text).toBe('Hello');
    expect(collector.reasoning).toBe('think more');
    expect(collector.usage).toBe(usage);
    expect(collector.finish).toEqual({ reason: 'stop', providerReason: 'stop' });
    expect(collector.buildResponse()).toMatchObject({
      content: 'Hello', reasoning: 'think more', usage, image_urls: ['a.png'], providerNativeAssistantTurn: nativeTurn,
      finish: { reason: 'stop', providerReason: 'stop' },
    });
  });

  it('opens one reasoning segment with the segment_<id>:reasoning_<id> scheme and ends it normally on completeNormally', async () => {
    const { collector, events, scope } = setup();
    await collector.consume(stream(
      new ChunkResponse({ content: '', reasoning: 'a' }),
      new ChunkResponse({ content: '', reasoning: 'b' }),
      new ChunkResponse({ content: 'text' }),
    ), scope);
    collector.completeNormally();

    const reasoning = reasoningEvents(events);
    expect(reasoning.map((event) => event.type)).toEqual(['SEGMENT_START', 'SEGMENT_CONTENT', 'SEGMENT_CONTENT', 'SEGMENT_END']);
    expect(new Set(reasoning.map((event) => event.segment_id)).size).toBe(1);
    expect(reasoning[0].segment_id).toMatch(/^segment_[0-9a-f]{32}:reasoning_[0-9a-f]{32}$/);
    expect(reasoning[3].payload).toEqual({});
    // The text segment (owned by the stream handler) ends before the reasoning segment.
    const ends = events.filter((event) => event.type === 'SEGMENT_END');
    expect(ends.at(-1)).toBe(reasoning[3]);
  });

  it('returns parsed invocations from completeNormally, or none when tool calls are disabled', async () => {
    const delta = new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: 'call_1', name: 'get_weather', arguments_delta: '{"city":"Berlin"}' }] });
    const enabled = setup(true);
    await enabled.collector.consume(stream(delta), enabled.scope);
    expect(enabled.collector.completeNormally().map((invocation) => [invocation.id, invocation.arguments])).toEqual([['call_1', { city: 'Berlin' }]]);
    const disabled = setup(false);
    await disabled.collector.consume(stream(delta), disabled.scope);
    expect(disabled.collector.completeNormally()).toEqual([]);
  });

  it('completeOutputLimited ends text and reasoning normally, fails tool segments and returns the discarded names', async () => {
    const { collector, events, scope } = setup();
    await collector.consume(stream(
      new ChunkResponse({ content: '', reasoning: 'r' }),
      new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: 'call_cut', name: 'get_weather', arguments_delta: '{"city":"Ber' }] }),
    ), scope);
    expect(collector.completeOutputLimited('Discarded.')).toEqual(['get_weather']);
    expect(events.find((event) => event.segment_id === 'call_cut' && event.type === 'SEGMENT_END')?.payload)
      .toMatchObject({ failed: true, error: 'Discarded.' });
    expect(reasoningEvents(events).at(-1)?.payload).toEqual({});
  });

  it.each([
    ['abandonInterrupted', { interrupted: true, reason: 'stop' }],
    ['abandonFailed', { failed: true, error: 'stop' }],
  ] as const)('%s ends open segments with its metadata', async (method, metadata) => {
    const { collector, events, scope } = setup();
    await collector.consume(stream(new ChunkResponse({ content: '', reasoning: 'r' }), new ChunkResponse({ content: 'partial' })), scope);
    collector[method]('stop');
    expect(reasoningEvents(events).at(-1)).toMatchObject({ type: 'SEGMENT_END', payload: metadata });
    const textEnd = events.find((event) => event.type === 'SEGMENT_END' && !String(event.segment_id).includes(':reasoning_'));
    expect(textEnd?.payload).toMatchObject(metadata);
  });

  it.each(['abandonInterrupted', 'abandonFailed'] as const)('%s after completeNormally emits nothing (R-3)', async (method) => {
    const { collector, events, scope } = setup();
    await collector.consume(stream(new ChunkResponse({ content: '', reasoning: 'r' }), new ChunkResponse({ content: 'done' })), scope);
    collector.completeNormally();
    const count = events.length;
    collector[method]('late');
    expect(events).toHaveLength(count);
    expect(collector.completeNormally()).toEqual([]);
    expect(collector.completeOutputLimited('x')).toEqual([]);
    expect(events).toHaveLength(count);
  });

  it('throws the interruption at the stream fences', async () => {
    const { collector, scope } = setup();
    async function* interrupting() {
      yield new ChunkResponse({ content: 'a' });
      scope.interrupt('user stop');
      yield new ChunkResponse({ content: 'b' });
    }
    const error = await collector.consume(interrupting(), scope).catch((caught) => caught);
    expect(isAgentInterruptionError(error)).toBe(true);
    expect(collector.text).toBe('a');
  });
});
