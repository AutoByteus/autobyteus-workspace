import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../src/memory/compaction/compaction-summary-prompt.js';
import { CACHED_SUMMARY_ATTEMPTS, TRANSCRIPT_SUMMARY_ATTEMPTS } from '../../src/memory/compaction/compaction-summarizer.js';

export type CompactionSummaryPrompts = Readonly<{ transcript: string; cached: string }>;
const DEFAULT_PROMPTS: CompactionSummaryPrompts = { transcript: COMPACTION_SUMMARY_PROMPT, cached: COMPACTION_SUMMARY_INSTRUCTION };
type RequestMessages = ReadonlyArray<{ content?: unknown }>;

/**
 * Which compaction summary request this is, recognised by what the model receives: the transcript prompt as a message
 * (`transcript`) or the summary instruction as the last message (`cached`); `null` for an agent request. A test that
 * configures its own prompts passes them.
 */
export const compactionSummaryRequestMode = (
  messages: RequestMessages, prompts: CompactionSummaryPrompts = DEFAULT_PROMPTS,
): 'cached' | 'transcript' | null => messages.some((message) => message.content === prompts.transcript) ? 'transcript'
  : messages.at(-1)?.content === prompts.cached ? 'cached' : null;

export const isCompactionSummaryRequest = (messages: RequestMessages, prompts: CompactionSummaryPrompts = DEFAULT_PROMPTS): boolean =>
  compactionSummaryRequestMode(messages, prompts) !== null;

/**
 * Numbers the summary attempts a test LLM receives, from the requests themselves. One compaction operation sends up to
 * `CACHED_SUMMARY_ATTEMPTS` cached requests, then up to `TRANSCRIPT_SUMMARY_ATTEMPTS` transcript requests, all on the
 * operation's abort signal. A summary request is the next attempt of the operation before it when it directly follows
 * it on the same signal and that operation still has an attempt of its mode left; otherwise (after an agent request, on
 * a new signal, or after a failed operation's last attempt: a user retry or a restart) it is attempt 1 of a new operation.
 */
export class CompactionAttempts {
  private operation: { signal: AbortSignal | null | undefined; cached: number; transcript: number } | null = null;

  /** Observes one request; returns its attempt number, or 0 for an agent request. */
  observe(messages: RequestMessages, signal: AbortSignal | null | undefined, prompts: CompactionSummaryPrompts = DEFAULT_PROMPTS): number {
    const mode = compactionSummaryRequestMode(messages, prompts);
    if (mode === null) {
      this.operation = null;
      return 0;
    }
    const current = this.operation;
    const continues = current !== null && current.signal === signal && (mode === 'cached'
      ? current.transcript === 0 && current.cached < CACHED_SUMMARY_ATTEMPTS
      : current.transcript < TRANSCRIPT_SUMMARY_ATTEMPTS);
    const operation = continues ? current : { signal, cached: 0, transcript: 0 };
    operation[mode] += 1;
    this.operation = operation;
    return operation.cached + operation.transcript;
  }
}
