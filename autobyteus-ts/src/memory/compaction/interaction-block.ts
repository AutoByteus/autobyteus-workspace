import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { ToolResultDigest } from './tool-result-digest.js';

export type InteractionBlockKind = 'user' | 'tool_continuation' | 'recovery';

export type InteractionBlock = {
  blockId: string;
  turnId: string | null;
  traceIds: string[];
  traces: RawTraceItem[];
  openingTraceId: string | null;
  closingTraceId: string | null;
  blockKind: InteractionBlockKind;
  hasAssistantTrace: boolean;
  toolCallIds: string[];
  matchedToolCallIds: string[];
  hasMalformedToolTrace: boolean;
  isStructurallyComplete: boolean;
  toolResultDigests: ToolResultDigest[];
};

export const INTERACTION_BLOCK_BOUNDARY_TRACE_TYPES = new Set(['user', 'tool_continuation']);

export const isInteractionBoundaryTrace = (traceType: string | null | undefined): boolean =>
  typeof traceType === 'string' && INTERACTION_BLOCK_BOUNDARY_TRACE_TYPES.has(traceType);
