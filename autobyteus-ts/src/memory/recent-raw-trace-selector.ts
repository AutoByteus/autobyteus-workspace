import type { RawTraceItem } from './models/raw-trace-item.js';

export const findRecentRawTraceIds = (
  traces: readonly RawTraceItem[],
  turnId: string | null | undefined,
  traceType: string,
  content?: string | null,
): string[] | undefined => {
  if (!turnId) return undefined;
  const match = [...traces].reverse().find((trace) =>
    trace.turnId === turnId
    && trace.traceType === traceType
    && (!content || trace.content === content));
  return match ? [match.id] : undefined;
};
