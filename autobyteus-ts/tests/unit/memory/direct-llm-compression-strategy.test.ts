import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { buildFinish } from '../../../src/llm/utils/llm-response-finish.js';
import { DirectLlmCompressionStrategy } from '../../../src/memory/compaction/direct-llm-compression-strategy.js';
import { COMPACTION_SUMMARY_PROMPT } from '../../../src/memory/compaction/compaction-summary-prompt.js';
import { COMPACTION_SUMMARY_HEADINGS, parseCompactionSummary, validateCompactionSummaryBody } from '../../../src/memory/compaction/compaction-summary-parser.js';

const body = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\n- Keep /repo/check.ts; approval pending.`).join('\n\n');
const tagged = `<compaction_summary>\n${body}\n</compaction_summary>`;
const content = 'caller prepared\n' + 'x'.repeat(2500) + ' MIDDLE: do not deploy without approval ' + 'x'.repeat(2500);
class Model extends BaseLLM {
  send = vi.fn(async () => new CompleteResponse({ content: tagged, finish: buildFinish('stop', 'end_turn') }));
  cleaned = vi.fn(async () => undefined);
  constructor(capacity: number | null = 100_000) {
    super(new LLMModel({ name: 'fixture', value: 'fixture', canonicalName: 'fixture', provider: LLMProvider.OPENAI, maxContextTokens: capacity }), new LLMConfig({ maxTokens: 8192 }));
  }
  protected _sendMessagesToLLM() { return this.send(); }
  protected async *_streamMessagesToLLM() {}
  override cleanup() { return this.cleaned(); }
}
const execution = (signal = new AbortController().signal) => ({
  signal, operationId: 'op', executionTurnId: 'turn', getParentModelIdentifier: () => 'parent-a', observe: vi.fn(),
});
// The production backoff is node:timers/promises, driven with a mocked abortable wait.
const waits = vi.hoisted(() => vi.fn(async (_ms: number, _value: unknown, { signal }: { signal: AbortSignal }) => { signal.throwIfAborted(); }));
vi.mock('node:timers/promises', () => ({ setTimeout: waits }));
beforeEach(() => { waits.mockClear(); });
afterEach(() => vi.restoreAllMocks());

describe('direct compression strategy', () => {
  it('ships the exact approved v5 literal', () => {
    expect(createHash('sha256').update(COMPACTION_SUMMARY_PROMPT).digest('hex')).toBe('2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7');
  });
  it('extracts one inner body, ignores exterior, and preserves Markdown/CRLF', () => {
    expect(parseCompactionSummary(`outside\n${tagged}\noutside`)).toBe(body);
    const empty = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\r\n(none)`).join('\r\n\r\n');
    expect(parseCompactionSummary(`<compaction_summary>${empty}</compaction_summary>`)).toBe(empty);
    expect(validateCompactionSummaryBody(`\n${body}\n`)).toBe(body);
  });
  it.each(['', 'plain summary', '<compaction_summary></compaction_summary>', tagged + tagged,
    tagged.replace('</compaction_summary>', ''), '</compaction_summary>' + tagged,
    tagged.replace('## Current state', '## Other'), tagged.replace('- Keep /repo/check.ts; approval pending.', '')])('rejects invalid envelope %s', value => {
    expect(() => parseCompactionSummary(value)).toThrow();
  });
  it.each([tagged, undefined, {}, body.replace('## Current state', '## Other'), 'prefix\n' + body])('rejects non-body result %s', value => {
    expect(() => validateCompactionSummaryBody(value as string)).toThrow();
  });
  it.each([1, 2, 3])('succeeds on attempt %i, fresh parent/config/identity, identical content and no numeric prefix', async success => {
    const models: Model[] = []; const exec = execution(); let parent = 0;
    exec.getParentModelIdentifier = () => `parent-${++parent}`;
    const factory = vi.fn(async () => {
      const model = new Model(); models.push(model);
      if (models.length < success) model.send.mockRejectedValue(new Error('503'));
      vi.spyOn(model, 'sendMessages'); return model;
    });
    await expect(new DirectLlmCompressionStrategy(factory, exec).compress(content)).resolves.toBe(body);
    expect(factory.mock.calls.map((call: any) => call[0].parentModelIdentifier)).toEqual(Array.from({ length: success }, (_, i) => `parent-${i + 1}`));
    const ids = models.map(model => {
      const [messages, kwargs, options] = vi.mocked(model.sendMessages).mock.calls[0]!;
      expect(messages.map(m => m.content)).toEqual([COMPACTION_SUMMARY_PROMPT, content]);
      expect(kwargs).not.toHaveProperty('tools');
      expect(options).toMatchObject({ signal: exec.signal, retryMode: 'single_attempt' });
      expect(options).not.toHaveProperty('promptCacheScope'); // AC-005: one-shot summarizer is never cached
      expect(model.send).toHaveBeenCalledOnce(); expect(model.cleaned).toHaveBeenCalledOnce();
      return kwargs!.logicalConversationId;
    });
    expect(new Set(ids).size).toBe(success);
    expect(waits.mock.calls.map(c => c[0])).toEqual([1000, 2000].slice(0, success - 1));
  });
  it.each(['401', '429', '503', 'timeout', 'empty', 'malformed', 'incomplete', 'capacity', 'credentials'])('exhausts uniformly for %s with no fourth attempt', async kind => {
    const models: Model[] = [];
    const factory = vi.fn(async () => {
      if (kind === 'credentials') throw new Error(kind);
      const model = new Model(kind === 'capacity' ? 100 : 100_000); models.push(model);
      if (['401','429','503','timeout'].includes(kind)) model.send.mockRejectedValue(new Error(kind));
      else if (['empty','malformed'].includes(kind)) model.send.mockResolvedValue(new CompleteResponse({ content: kind === 'empty' ? '' : 'bad', reasoning: tagged }));
      else if (kind === 'incomplete') model.send.mockResolvedValue(new CompleteResponse({ content: tagged, finish: buildFinish('output_limit', 'max_tokens') }));
      return model;
    });
    await expect(new DirectLlmCompressionStrategy(factory, execution()).compress(content)).rejects.toThrow();
    expect(factory).toHaveBeenCalledTimes(3); expect(waits.mock.calls.map(c => c[0])).toEqual([1000,2000]);
    for (const model of models) { expect(model.send).toHaveBeenCalledTimes(kind === 'capacity' ? 0 : 1); expect(model.cleaned).toHaveBeenCalledOnce(); }
  });
  it('keeps unknown completion eligible and observer/cleanup errors diagnostic only', async () => {
    const model = new Model(); model.send.mockResolvedValue(new CompleteResponse({ content: tagged })); model.cleaned.mockRejectedValue(new Error('cleanup'));
    const exec = execution(); exec.observe.mockImplementation(() => { throw new Error('observer'); });
    await expect(new DirectLlmCompressionStrategy(async () => model, exec).compress(content)).resolves.toBe(body);
    expect(model.send).toHaveBeenCalledOnce(); expect(waits).not.toHaveBeenCalled();
  });
  it('cancels before construction and rejects late successful output without retry', async () => {
    const controller = new AbortController(); controller.abort(); const factory = vi.fn(async () => new Model());
    await expect(new DirectLlmCompressionStrategy(factory, execution(controller.signal)).compress(content)).rejects.toThrow();
    expect(factory).not.toHaveBeenCalled();
    const active = new AbortController(); const model = new Model();
    model.send.mockImplementation(async () => { active.abort(); return new CompleteResponse({ content: tagged }); });
    await expect(new DirectLlmCompressionStrategy(async () => model, execution(active.signal)).compress(content)).rejects.toMatchObject({ code: 'cancelled' });
    expect(model.cleaned).toHaveBeenCalledOnce(); expect(waits).not.toHaveBeenCalled();
  });
  it('does not call again if cancellation occurs during the retry wait', async () => {
    const controller = new AbortController(); const factory = vi.fn(async () => { throw new Error('API'); });
    waits.mockImplementationOnce(async () => { controller.abort(); controller.signal.throwIfAborted(); });
    await expect(new DirectLlmCompressionStrategy(factory, execution(controller.signal)).compress(content)).rejects.toThrow();
    expect(factory).toHaveBeenCalledOnce();
  });
});
