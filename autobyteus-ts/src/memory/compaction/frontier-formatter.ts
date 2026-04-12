import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { InteractionBlock } from './interaction-block.js';

const safeStringify = (value: unknown): string => formatToCleanString(value);

const formatRawTrace = (trace: RawTraceItem, maxItemChars?: number | null): string => {
  const prefix = `(${trace.turnId}:${trace.seq}) ${trace.traceType.toUpperCase()}:`;

  let line: string;
  if (trace.traceType === 'tool_call') {
    line = `${prefix} ${safeStringify(trace.toolName ?? 'unknown_tool')} ${safeStringify(trace.toolArgs ?? {})}`;
  } else if (trace.traceType === 'tool_result') {
    line = `${prefix} ${safeStringify(trace.toolName ?? 'unknown_tool')} ${safeStringify(trace.toolError ?? trace.toolResult)}`;
  } else {
    line = `${prefix} ${safeStringify(trace.content)}`;
  }

  return clampRenderedLine(line, maxItemChars);
};

export class FrontierFormatter {
  format(blocks: InteractionBlock[], maxItemChars?: number | null): string[] {
    const lines: string[] = [];

    for (const block of blocks) {
      lines.push(`[BLOCK ${block.blockId}] turn=${block.turnId ?? 'unknown'} kind=${block.blockKind}`);
      for (const trace of block.traces) {
        lines.push(formatRawTrace(trace, maxItemChars));
      }
    }

    return lines;
  }
}
