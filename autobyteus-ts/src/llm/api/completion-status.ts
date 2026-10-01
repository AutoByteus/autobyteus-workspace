import type { CompleteResponse } from '../utils/response-types.js';
export type CompletionMetadata = Pick<CompleteResponse, 'completionStatus' | 'completionReason'>;

export const completionFromReason = (
  reason: unknown, complete: readonly string[], incomplete: readonly string[], nonTextOutput = false,
): CompletionMetadata => {
  const completionReason = typeof reason === 'string' ? reason : null;
  return { completionReason, completionStatus: nonTextOutput ? 'incomplete'
    : completionReason && complete.includes(completionReason) ? 'complete'
    : completionReason && incomplete.includes(completionReason) ? 'incomplete' : 'unknown' };
};

export const responsesCompletion = (response: { status?: string; incomplete_details?: unknown; output?: any[] }): CompletionMetadata => {
  const nonText = response.output?.some((item) =>
    item.type !== 'message' && item.type !== 'reasoning' ||
    item.content?.some((part: { type: string }) => part.type === 'refusal')) ?? false;
  return completionFromReason(response.status, ['completed'], ['incomplete', 'failed', 'cancelled'],
    nonText || Boolean(response.incomplete_details));
};
