import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import { createToolCallIdentity, toolCallIdentityKey } from '../models/tool-call-identity.js';
import type { ToolCallContext } from '../tool-trace-lifecycle-index.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import type { ToolResultDigest } from './tool-result-digest.js';

export class ToolResultDigestBuilder {
  build(
    trace: RawTraceItem,
    maxItemChars?: number | null,
    callContextByIdentity: ReadonlyMap<string, ToolCallContext> = new Map(),
  ): ToolResultDigest {
    const summarySource = trace.toolError ?? trace.toolResult ?? '';
    const rendered = clampRenderedLine(formatToCleanString(summarySource), maxItemChars);
    const identity = createToolCallIdentity(trace.turnId, trace.toolCallId);
    const context = identity ? callContextByIdentity.get(toolCallIdentityKey(identity)) : null;

    return {
      traceId: trace.id,
      toolCallId: trace.toolCallId ?? null,
      toolName: trace.toolName ?? context?.toolName ?? null,
      status: trace.toolError !== null && trace.toolError !== undefined ? 'error' : 'success',
      summary: rendered,
    };
  }
}
