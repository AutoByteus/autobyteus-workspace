import { describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { CompactionSummarizer, CACHED_SUMMARY_ATTEMPTS, TRANSCRIPT_SUMMARY_ATTEMPTS } from '../../../src/memory/compaction/compaction-summarizer.js';
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../../src/memory/compaction/compaction-summary-prompt.js';
import { COMPACTION_SUMMARY_HEADINGS } from '../../../src/memory/compaction/compaction-summary-parser.js';
import { CompactionInvocationError, type CompactionSummaryMode } from '../../../src/memory/compaction/compaction-execution.js';
import type { ConversationSummaryPort, SummaryAttemptResult, SummaryRequestIdentity } from '../../../src/memory/compaction/conversation-summary-port.js';

const body = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\n- Keep /repo/check.ts; approval pending.`).join('\n\n');
const tagged = `<compaction_summary>\n${body}\n</compaction_summary>`;
const baseline = [
  new Message(MessageRole.SYSTEM, { content: 'Agent system prompt' }),
  new Message(MessageRole.USER, { content: 'Do the task' }),
  new Message(MessageRole.ASSISTANT, { content: 'Done so far' }),
];
const transcript = 'rendered compactable history';

const result = (mode: CompactionSummaryMode, content: string, extra: Partial<SummaryAttemptResult> = {}): SummaryAttemptResult => ({
  content, hasToolCalls: false,
  metadata: { mode, modelIdentifier: 'model', provider: 'ANTHROPIC', invocationId: `compaction_${mode}`, completionStatus: 'unknown', completionReason: null, usage: null },
  ...extra,
});

const fakePort = (overrides: { [K in keyof ConversationSummaryPort]?: (...args: any[]) => any } = {}) => ({
  usesCachedSummary: vi.fn(overrides.usesCachedSummary ?? (() => true)),
  fitsInputBudget: vi.fn(overrides.fitsInputBudget ?? ((_messages: readonly Message[], _extra: string) => true)),
  requestCachedSummary: vi.fn(overrides.requestCachedSummary
    ?? (async (_m: readonly Message[], _i: string, _id: SummaryRequestIdentity, _s: AbortSignal) => result('cached', tagged))),
  requestTranscriptSummary: vi.fn(overrides.requestTranscriptSummary
    ?? (async (_p: string, _c: string, _id: SummaryRequestIdentity, _s: AbortSignal) => result('transcript', tagged))),
});

const run = (port: ConversationSummaryPort, signal = new AbortController().signal) => {
  const waits: number[] = [];
  const observe = vi.fn();
  const summarizer = new CompactionSummarizer(port, async (ms, waitSignal) => { waits.push(ms); waitSignal.throwIfAborted(); });
  const promise = summarizer.summarize({ baselineMessages: baseline, transcriptContent: transcript, operationId: 'op_1', executionTurnId: 'turn_7', signal, observe });
  return { promise, waits, observe };
};

describe('CompactionSummarizer', () => {
  it('summarizes with one cached request: the baseline conversation plus the instruction', async () => {
    const port = fakePort();
    const { promise, observe } = run(port);
    await expect(promise).resolves.toBe(body);
    expect(port.fitsInputBudget).toHaveBeenCalledWith(baseline, COMPACTION_SUMMARY_INSTRUCTION);
    expect(port.requestCachedSummary).toHaveBeenCalledOnce();
    const [messages, instruction, identity] = port.requestCachedSummary.mock.calls[0]!;
    expect(messages).toBe(baseline);
    expect(instruction).toBe(COMPACTION_SUMMARY_INSTRUCTION);
    expect(identity).toEqual({ operationId: 'op_1', executionTurnId: 'turn_7', attempt: 1 });
    expect(port.requestTranscriptSummary).not.toHaveBeenCalled();
    expect(observe.mock.calls.map(([event]) => [event.attempt, event.mode, event.outcome])).toEqual([[1, 'cached', 'started'], [1, 'cached', 'succeeded']]);
  });

  it.each([
    ['invalid summary', result('cached', 'Here is what I did instead.')],
    ['tool call', result('cached', '', { hasToolCalls: true })],
    ['incomplete output', result('cached', tagged, { metadata: { ...result('cached', '').metadata, completionStatus: 'incomplete' } })],
  ])('falls back to the transcript request after 2 cached failures: %s', async (_label, failed) => {
    const port = fakePort({ requestCachedSummary: vi.fn(async () => failed) });
    const { promise, observe } = run(port);
    await expect(promise).resolves.toBe(body);
    expect(port.requestCachedSummary).toHaveBeenCalledTimes(CACHED_SUMMARY_ATTEMPTS);
    expect(port.requestTranscriptSummary).toHaveBeenCalledOnce();
    const [systemPrompt, content, identity] = port.requestTranscriptSummary.mock.calls[0]!;
    expect([systemPrompt, content, identity.attempt]).toEqual([COMPACTION_SUMMARY_PROMPT, transcript, 3]);
    expect(observe.mock.calls.filter(([event]) => event.outcome === 'failed').map(([event]) => event.mode)).toEqual(['cached', 'cached']);
  });

  it('falls back to the transcript request after provider errors without waiting between cached attempts', async () => {
    const port = fakePort({ requestCachedSummary: vi.fn(async () => { throw new Error('503'); }) });
    const { promise, waits } = run(port);
    await expect(promise).resolves.toBe(body);
    expect(port.requestCachedSummary).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([]);
  });

  it('skips the cached request when it would not fit the input budget', async () => {
    const port = fakePort({ fitsInputBudget: vi.fn(() => false) });
    const { promise } = run(port);
    await expect(promise).resolves.toBe(body);
    expect(port.requestCachedSummary).not.toHaveBeenCalled();
    expect(port.requestTranscriptSummary.mock.calls[0]![2].attempt).toBe(1);
  });

  it('goes straight to the transcript request, with the full transcript budget, when the model does not select the cached summary', async () => {
    const port = fakePort({ usesCachedSummary: vi.fn(() => false), requestTranscriptSummary: vi.fn()
      .mockRejectedValueOnce(new Error('provider down')).mockResolvedValue(result('transcript', tagged)) });
    const { promise, waits } = run(port);
    await expect(promise).resolves.toBe(body);
    expect(port.fitsInputBudget).not.toHaveBeenCalled();
    expect(port.requestCachedSummary).not.toHaveBeenCalled();
    expect(port.requestTranscriptSummary.mock.calls.map(([, , identity]) => identity.attempt)).toEqual([1, 2]);
    expect(waits).toEqual([1000]);
  });

  it('exhausts 3 transcript attempts when the model does not select the cached summary', async () => {
    const port = fakePort({ usesCachedSummary: vi.fn(() => false), requestTranscriptSummary: vi.fn(async () => result('transcript', 'no block')) });
    const { promise } = run(port);
    await expect(promise).rejects.toMatchObject({ code: 'invalid_summary' });
    expect(port.requestTranscriptSummary).toHaveBeenCalledTimes(TRANSCRIPT_SUMMARY_ATTEMPTS);
    expect(port.requestCachedSummary).not.toHaveBeenCalled();
  });

  it('exhausts 2 cached and 3 transcript attempts, with unique attempt ids and the existing backoff', async () => {
    const port = fakePort({
      requestCachedSummary: vi.fn(async () => result('cached', 'no summary')),
      requestTranscriptSummary: vi.fn(async () => { throw new CompactionInvocationError('input_budget_exceeded', 'too big'); }),
    });
    const { promise, waits } = run(port);
    await expect(promise).rejects.toMatchObject({ name: 'CompactionInvocationError', code: 'input_budget_exceeded' });
    expect(port.requestTranscriptSummary).toHaveBeenCalledTimes(TRANSCRIPT_SUMMARY_ATTEMPTS);
    const attempts = [...port.requestCachedSummary.mock.calls, ...port.requestTranscriptSummary.mock.calls].map((call) => call[2].attempt);
    expect(attempts).toEqual([1, 2, 3, 4, 5]);
    expect(waits).toEqual([1000, 2000]);
  });

  it('keeps execution metadata of a failed provider call for diagnostics', async () => {
    const metadata = result('transcript', '').metadata;
    const port = fakePort({
      fitsInputBudget: vi.fn(() => false),
      requestTranscriptSummary: vi.fn(async () => { throw new CompactionInvocationError('generation_failure', '500', metadata); }),
    });
    const { promise, observe } = run(port);
    await expect(promise).rejects.toMatchObject({ execution: metadata });
    expect(observe.mock.calls.at(-1)![0]).toMatchObject({ outcome: 'failed', mode: 'transcript', execution: metadata, code: 'generation_failure' });
  });

  it('stops on abort: no further attempts, cancelled code, and no call when already aborted', async () => {
    const aborted = new AbortController(); aborted.abort();
    const idle = fakePort();
    await expect(run(idle, aborted.signal).promise).rejects.toThrow();
    expect(idle.requestCachedSummary).not.toHaveBeenCalled();

    const controller = new AbortController();
    const port = fakePort({ requestCachedSummary: vi.fn(async () => { controller.abort(); return result('cached', tagged); }) });
    await expect(run(port, controller.signal).promise).rejects.toMatchObject({ code: 'cancelled' });
    expect(port.requestCachedSummary).toHaveBeenCalledOnce();
    expect(port.requestTranscriptSummary).not.toHaveBeenCalled();
  });

  it('does not attempt again when cancelled during the transcript backoff', async () => {
    const controller = new AbortController();
    const port = fakePort({ fitsInputBudget: vi.fn(() => false), requestTranscriptSummary: vi.fn(async () => { throw new Error('API'); }) });
    const summarizer = new CompactionSummarizer(port, async (_ms, signal) => { controller.abort(); signal.throwIfAborted(); });
    await expect(summarizer.summarize({ baselineMessages: baseline, transcriptContent: transcript, operationId: 'op', executionTurnId: 't', signal: controller.signal }))
      .rejects.toThrow();
    expect(port.requestTranscriptSummary).toHaveBeenCalledOnce();
  });

  it('treats observer failures as diagnostic only', async () => {
    const port = fakePort();
    const summarizer = new CompactionSummarizer(port);
    await expect(summarizer.summarize({ baselineMessages: baseline, transcriptContent: transcript, operationId: 'op', executionTurnId: 't',
      signal: new AbortController().signal, observe: () => { throw new Error('observer'); } })).resolves.toBe(body);
  });
});
