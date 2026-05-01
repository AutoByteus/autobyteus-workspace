import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import type { ToolResultDigest } from './tool-result-digest.js';

export class ToolResultDigestBuilder {
  build(trace: RawTraceItem, maxItemChars?: number | null): ToolResultDigest {
    const summarySource = trace.toolError ?? trace.toolResult ?? '';
    const rendered = clampRenderedLine(formatToCleanString(summarySource), maxItemChars);

    return {
      traceId: trace.id,
      toolCallId: trace.toolCallId ?? null,
      toolName: trace.toolName ?? null,
      status: trace.toolError ? 'error' : trace.toolResult !== null && trace.toolResult !== undefined ? 'success' : 'unknown',
      summary: rendered,
    };
  }
}
