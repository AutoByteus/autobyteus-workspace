/**
 * Output-limit recovery policy (Claude Code style): after a response hits the output
 * limit, the turn continues with a hidden note, at most this many times in a row.
 */
export const MAX_OUTPUT_LIMIT_RECOVERIES = 3;

/** Segment error for a tool call discarded because the response hit the output limit. */
export const OUTPUT_LIMIT_DISCARDED_TOOL_CALL_ERROR =
  'Discarded: the output limit was reached before this tool call was complete.';

const describeLimit = (limit: number | null): string =>
  limit === null ? 'the output limit' : `the output limit of ${limit} tokens`;

const describeToolCalls = (toolNames: readonly string[]): string => {
  const names = [...new Set(toolNames)].map((name) => `\`${name}\``);
  const listed = names.length > 1
    ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
    : names[0]!;
  return `${names.length > 1 ? '' : 'a '}${listed} tool call${names.length > 1 ? 's' : ''}`;
};

/**
 * The hidden note for the next request. Its variant depends on what the cut response left:
 * a discarded tool call (regenerate in smaller pieces), kept text (resume directly), or nothing.
 */
export const buildOutputLimitRecoveryNote = (input: {
  discardedToolNames: readonly string[];
  keptText: boolean;
  limit: number | null;
}): string => {
  if (input.discardedToolNames.length) {
    const callWord = input.discardedToolNames.length > 1 ? 'calls were' : 'call was';
    return `System note: your previous response hit ${describeLimit(input.limit)} while generating ${describeToolCalls(input.discardedToolNames)}; the ${callWord} discarded and not executed. ` +
      'Break the work into smaller pieces (for example, write a large file in several smaller parts) and continue. Do not apologize or recap.';
  }
  if (input.keptText) {
    return 'System note: output token limit hit. Resume directly from where your previous message stopped — no apology, no recap. ' +
      'Break remaining work into smaller pieces.';
  }
  return `System note: your previous response hit ${describeLimit(input.limit)} before producing any visible output, so nothing was kept. ` +
    'Answer again from the start, breaking the work into smaller pieces.';
};

/** The turn's error after the recovery attempts are used up. */
export const buildOutputLimitExhaustedMessage = (limit: number | null): string =>
  `The model's response hit ${describeLimit(limit)} ${MAX_OUTPUT_LIMIT_RECOVERIES + 1} times in a row, ` +
  `so the turn stopped after ${MAX_OUTPUT_LIMIT_RECOVERIES} automatic recovery attempts. ` +
  'Ask for the work in smaller pieces (for example, write a large file in several parts) and send the request again.';
