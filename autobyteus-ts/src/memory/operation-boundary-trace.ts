import type { RawTraceItem } from './models/raw-trace-item.js';

export const OPERATION_BOUNDARY_TRACE_TYPE = 'operation_boundary';

export const getOperationBoundaryNoteContent = (
  traces: readonly RawTraceItem[],
  turnId: string,
): string | null => traces.filter((item) =>
  item.turnId === turnId
  && item.traceType === OPERATION_BOUNDARY_TRACE_TYPE
  && item.sourceEvent === 'AgentTurnInterruptedEvent').at(-1)?.content ?? null;
