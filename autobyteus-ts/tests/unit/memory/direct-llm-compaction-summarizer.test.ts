import {createHash} from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { DirectLlmCompactionSummarizer } from '../../../src/memory/compaction/direct-llm-compaction-summarizer.js';
import { COMPACTION_SUMMARY_PROMPT } from '../../../src/memory/compaction/compaction-summary-prompt.js';
import { COMPACTION_SUMMARY_HEADINGS, parseCompactionSummary } from '../../../src/memory/compaction/compaction-summary-parser.js';

export const body = COMPACTION_SUMMARY_HEADINGS.map((heading) => `## ${heading}\n- Keep /repo/check.ts; approval pending.`).join('\n\n');
const tagged = `<compaction_summary>\n${body}\n</compaction_summary>`;
class Model extends BaseLLM {
  send = vi.fn(async () => new CompleteResponse({ content: tagged, completionStatus: 'complete' }));
  cleaned = vi.fn(async () => undefined);
  constructor(capacity: number | null = 100_000) {
    super(new LLMModel({ name: 'fixture', value: 'fixture', canonicalName: 'fixture', provider: LLMProvider.OPENAI, maxContextTokens: capacity }), new LLMConfig({ maxTokens: 8192 }));
  }
  protected _sendMessagesToLLM() { return this.send(); }
  protected async *_streamMessagesToLLM() {}
  override cleanup() { return this.cleaned(); }
}
const input = (signal = new AbortController().signal) => ({
  units: [{ id: 'u', kind: 'message' as const, startIndex: 0, endIndex: 0, rawTraceIds: ['r'],
    messages: [new Message(MessageRole.USER, { content: 'begin '+ 'x'.repeat(2500) + ' MIDDLE: do not deploy without approval '+ 'x'.repeat(2500) + ' end' })] }],
  summaryBudgetTokens: 1500, parentModelIdentifier: 'parent-a', operationId: 'op', executionTurnId: 'turn', signal,
  maxItemChars: 2000,
});

describe('direct compaction summary', () => {
  it('ships the exact approved prompt literal', () => {
    // Approved SR-008 prompt-v5 literal, reaffirmed by SR-012/013. No dependency on the ticket's lifecycle path.
    expect(createHash('sha256').update(COMPACTION_SUMMARY_PROMPT).digest('hex')).toBe('2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7');
  });
  it('extracts only one inner body and preserves Markdown', () => {
    expect(parseCompactionSummary(`outside\n${tagged}\noutside`)).toBe(body);
  });
  it.each(['', 'plain summary', '<compaction_summary></compaction_summary>', tagged+tagged,
    tagged.replace('</compaction_summary>', ''), '</compaction_summary>'+tagged,
    tagged.replace('## Current state', '## Other'), tagged.replace('- Keep /repo/check.ts; approval pending.', '')])('rejects invalid output %s', (value) => {
    expect(() => parseCompactionSummary(value)).toThrow();
  });
  it('accepts empty factual sections only via (none), and preserves CRLF Markdown body', () => {
    const emptySections = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\r\n(none)`).join('\r\n\r\n');
    expect(parseCompactionSummary(`<compaction_summary>${emptySections}</compaction_summary>`)).toBe(emptySections);
  });
  it('does not create a model after early cancellation and cleans up a model created during cancellation', async () => {
    const early = new AbortController(); early.abort();
    const factory = vi.fn(async () => new Model());
    await expect(new DirectLlmCompactionSummarizer(factory).summarize(input(early.signal))).rejects.toThrow();
    expect(factory).not.toHaveBeenCalled();
    const controller = new AbortController(); const llm = new Model();
    const creating = async () => { controller.abort(); return llm; };
    await expect(new DirectLlmCompactionSummarizer(creating).summarize(input(controller.signal))).rejects.toMatchObject({code:'cancelled'});
    expect(llm.send).not.toHaveBeenCalled(); expect(llm.cleaned).toHaveBeenCalledOnce();
  });
  it('uses one call, full natural input, no tools, distinct identity and current parent per attempt', async () => {
    const models: Model[] = [];
    const factory = vi.fn(async () => { const llm = new Model(); models.push(llm); return llm; });
    const summarizer = new DirectLlmCompactionSummarizer(factory);
    const first = await summarizer.summarize(input());
    const second = await summarizer.summarize({ ...input(), parentModelIdentifier: 'parent-b' });
    expect(factory.mock.calls.map((call: any) => call[0].parentModelIdentifier)).toEqual(['parent-a', 'parent-b']);
    expect(first.execution.invocationId).not.toBe(second.execution.invocationId);
    for (const llm of models) { expect(llm.send).toHaveBeenCalledTimes(1); expect(llm.cleaned).toHaveBeenCalledTimes(1); }
    const llm = new Model(); const dispatch = vi.spyOn(llm, 'sendMessages');
    await new DirectLlmCompactionSummarizer(async () => llm).summarize(input());
    const [messages, , kwargs, options] = dispatch.mock.calls[0]!;
    expect(messages[0].content).toBe(COMPACTION_SUMMARY_PROMPT);
    expect(messages[1].content).toContain('MIDDLE: do not deploy without approval');
    expect(kwargs).not.toHaveProperty('tools'); expect(options?.signal).toBeDefined();
  });
  it.each(['incomplete', 'unknown'] as const)('handles %s termination independently of tags', async (status) => {
    const llm = new Model(); llm.send.mockResolvedValue(new CompleteResponse({ content: tagged, completionStatus: status }));
    const result = new DirectLlmCompactionSummarizer(async () => llm).summarize(input());
    if (status === 'incomplete') await expect(result).rejects.toMatchObject({ code: 'incomplete_summary' });
    else await expect(result).resolves.toMatchObject({ summary: body, execution: { completionStatus: 'unknown' } });
    expect(llm.send).toHaveBeenCalledTimes(1);
  });
  it('does not extract a summary from reasoning', async () => {
    const llm = new Model(); llm.send.mockResolvedValue(new CompleteResponse({ content: '', reasoning: tagged }));
    await expect(new DirectLlmCompactionSummarizer(async () => llm).summarize(input())).rejects.toMatchObject({ code: 'invalid_summary' });
  });
  it.each([100, null])('rejects capacity %s before generation and still cleans up', async (capacity) => {
    const llm = new Model(capacity);
    await expect(new DirectLlmCompactionSummarizer(async () => llm).summarize(input())).rejects.toMatchObject({ code: capacity ? 'input_budget_exceeded' : 'input_capacity_unavailable' });
    expect(llm.send).not.toHaveBeenCalled(); expect(llm.cleaned).toHaveBeenCalledOnce();
  });
  it('rejects late results after cancellation; cleanup failure does not mask success/error', async () => {
    const llm = new Model(); const controller = new AbortController();
    llm.send.mockImplementation(async () => { controller.abort(); return new CompleteResponse({ content: tagged }); });
    llm.cleaned.mockRejectedValue(new Error('cleanup'));
    await expect(new DirectLlmCompactionSummarizer(async () => llm).summarize(input(controller.signal))).rejects.toMatchObject({ code: 'cancelled' });
    llm.send.mockResolvedValue(new CompleteResponse({ content: tagged }));
    await expect(new DirectLlmCompactionSummarizer(async () => llm).summarize(input())).resolves.toMatchObject({ summary: body });
  });
});
