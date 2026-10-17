import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LlmCallTiming } from '../../../../src/agent/loop/llm-call-throughput.js';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { LlmPhase } from '../../../../src/agent/loop/llm-phase.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';

const usage = (outputTokens: number, reasoningOutputTokens?: number | null) => buildLlmTokenUsageObservation({
  inputTokens: 1000, outputTokens, totalTokens: 1000 + outputTokens, reasoningOutputTokens, rawUsage: null,
});

type Step = { atMs: number; chunk: ChunkResponse };
const time = (steps: Step[], requestAtMs = 0) => {
  let clock = requestAtMs;
  const timing = new LlmCallTiming(() => clock);
  timing.start();
  for (const step of steps) {
    clock = step.atMs;
    timing.observeChunk(step.chunk);
  }
  return timing;
};

describe('LlmCallTiming (DEC-002 native)', () => {
  it('uses generation speed when the first chunk carried reasoning (streamed reasoning, e.g. DeepSeek)', () => {
    const timing = time([
      { atMs: 1200, chunk: new ChunkResponse({ content: '', reasoning: 'thinking' }) },
      { atMs: 3000, chunk: new ChunkResponse({ content: 'answer' }) },
      { atMs: 6200, chunk: new ChunkResponse({ content: '', is_complete: true }) },
    ]);
    expect(timing.throughput(usage(500, 300))).toEqual({ method: 'generation', output_tokens: 500, duration_ms: 5000 });
  });

  it('uses generation speed for a content-first call reporting 0 or no reasoning tokens (single-call turn, AC-001)', () => {
    const steps = [
      { atMs: 800, chunk: new ChunkResponse({ content: 'Hello' }) },
      { atMs: 2800, chunk: new ChunkResponse({ content: ' world', is_complete: true }) },
    ];
    expect(time(steps).throughput(usage(240, 0))).toEqual({ method: 'generation', output_tokens: 240, duration_ms: 2000 });
    expect(time(steps).throughput(usage(240, null))).toEqual({ method: 'generation', output_tokens: 240, duration_ms: 2000 });
  });

  it('uses end to end when reasoning was hidden before the first visible chunk (AC-003)', () => {
    const timing = time([
      { atMs: 9000, chunk: new ChunkResponse({ content: 'final' }) },
      { atMs: 10000, chunk: new ChunkResponse({ content: '', is_complete: true }) },
    ], 1000);
    expect(timing.throughput(usage(1000, 900))).toEqual({ method: 'end_to_end', output_tokens: 1000, duration_ms: 9000 });
  });

  it('uses end to end when the response arrives in one chunk, and counts tool-call deltas as response data', () => {
    expect(time([{ atMs: 3000, chunk: new ChunkResponse({ content: 'all', is_complete: true }) }], 500)
      .throughput(usage(50, 0))).toEqual({ method: 'end_to_end', output_tokens: 50, duration_ms: 2500 });
    const toolCall = time([
      { atMs: 700, chunk: new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: 'c', name: 'run', arguments_delta: '{' }] }) },
      { atMs: 1700, chunk: new ChunkResponse({ content: '', is_complete: true }) },
    ]);
    expect(toolCall.throughput(usage(40, 0))).toEqual({ method: 'generation', output_tokens: 40, duration_ms: 1000 });
  });

  it('gives no reading without a final chunk or an output count', () => {
    expect(time([{ atMs: 100, chunk: new ChunkResponse({ content: 'partial' }) }]).throughput(usage(10, 0))).toBeNull();
    const done = time([{ atMs: 900, chunk: new ChunkResponse({ content: 'x', is_complete: true }) }]);
    expect(done.throughput({ ...usage(10, 0), output_tokens: null })).toBeNull();
  });
});

class TimedStreamLLM extends BaseLLM {
  constructor(private readonly advance: (ms: number) => void) {
    super(
      new LLMModel({ name: 'tps-model', value: 'tps-model', canonicalName: 'tps-model', provider: LLMProvider.DEEPSEEK,
        activeContextTokens: 128_000, maxContextTokens: 128_000, maxOutputTokens: 4_096 }),
      new LLMConfig({ maxTokens: 4_096 }),
    );
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    this.advance(1500); // waiting for the first token
    yield new ChunkResponse({ content: 'Rivers ' });
    this.advance(3000);
    yield new ChunkResponse({ content: 'run.', usage: usage(330, 0), is_complete: true });
  }
}

describe('LlmPhase reports each call TPS with its usage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a single-call plain-text turn carries a generation reading (AC-001)', async () => {
    let clock = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-phase-tps-'));
    try {
      const llm = new TimedStreamLLM((ms) => { clock += ms; });
      const state = new AgentRuntimeState('tps-agent');
      state.llmInstance = llm;
      state.memoryManager = new MemoryManager({ store: new FileMemoryStore(tempDir, 'tps-agent') });
      state.toolInstances = {};
      state.statusManagerRef = { notifier: { notifyAgentCompactionStatus: vi.fn() } } as any;
      const context = new AgentContext('tps-agent', new AgentConfig('tps', 'writer', 'single call', llm), state);
      const turn = new AgentTurn('turn-tps');
      const notifyAgentTokenUsageUpdated = vi.fn();
      await new LlmPhase().run(
        { llmUserMessage: new LLMUserMessage({ content: 'poem' }), turnId: turn.turnId,
          sourceEvent: new UserMessageReceivedEvent(new AgentInputUserMessage('poem')) },
        context, turn,
        { notifyAgentSegmentEvent: vi.fn(), notifyAgentTokenUsageUpdated, notifyAgentErrorOutputGeneration: vi.fn() } as any,
      );
      expect(notifyAgentTokenUsageUpdated).toHaveBeenCalledWith(expect.objectContaining({
        output_throughput: { method: 'generation', output_tokens: 330, duration_ms: 3000 },
      }));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('native token-usage stream payload', () => {
  it('passes output_throughput through to the server converter', async () => {
    const { createTokenUsageUpdatedData } = await import('../../../../src/agent/streaming/events/stream-event-payload-token-usage.js');
    const reading = { method: 'generation', output_tokens: 330, duration_ms: 3000 };
    expect(createTokenUsageUpdatedData({ usage: usage(330, 0), output_throughput: reading }).output_throughput).toEqual(reading);
    expect(createTokenUsageUpdatedData({ usage: usage(330, 0), output_throughput: null }).output_throughput).toBeNull();
    expect(createTokenUsageUpdatedData({ usage: usage(330, 0) }).output_throughput).toBeUndefined();
  });
});
