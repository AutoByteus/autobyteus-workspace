import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import type { InteractionBlock } from './interaction-block.js';

export type CompactionTaskPromptBuildOptions = {
  maxItemChars?: number | null;
};

export const COMPACTION_OUTPUT_CONTRACT = [
  'Return JSON only with this shape:',
  '{',
  '  "episodic_summary": "string",',
  '  "critical_issues": [{ "fact": "string" }],',
  '  "unresolved_work": [{ "fact": "string" }],',
  '  "durable_facts": [{ "fact": "string" }],',
  '  "user_preferences": [{ "fact": "string" }],',
  '  "important_artifacts": [{ "fact": "string" }]',
  '}',
  'The output contract is mandatory. Do not return prose outside the JSON object.'
].join('\n');

const safeStringify = (value: unknown): string => formatToCleanString(value);

const formatRawTrace = (trace: RawTraceItem, maxItemChars?: number | null): string => {
  let line: string;
  if (trace.traceType === 'tool_call') {
    line = `Assistant requested tool ${safeStringify(trace.toolName ?? 'unknown_tool')} with arguments ${safeStringify(trace.toolArgs ?? {})}.`;
  } else if (trace.traceType === 'tool_result') {
    line = `Tool result from ${safeStringify(trace.toolName ?? 'unknown_tool')}: ${safeStringify(trace.toolError ?? trace.toolResult)}`;
  } else if (trace.traceType === 'user') {
    line = `User: ${safeStringify(trace.content)}`;
  } else if (trace.traceType === 'assistant') {
    line = `Assistant: ${safeStringify(trace.content)}`;
  } else {
    line = `Context note: ${safeStringify(trace.content)}`;
  }

  return clampRenderedLine(line, maxItemChars);
};

export class CompactionTaskPromptBuilder {
  buildTaskPrompt(blocks: InteractionBlock[], options: CompactionTaskPromptBuildOptions = {}): string {
    return [
      'Compact the settled blocks below into durable AutoByteus memory.',
      'Use the current output contract exactly.',
      '',
      '[OUTPUT_CONTRACT]',
      COMPACTION_OUTPUT_CONTRACT,
      '',
      '[SETTLED_BLOCKS]',
      ...this.renderBlocks(blocks, options.maxItemChars),
    ].join('\n');
  }

  private renderBlocks(blocks: InteractionBlock[], maxItemChars?: number | null): string[] {
    const lines: string[] = [];

    for (const block of blocks) {
      const digestByTraceId = new Map(block.toolResultDigests.map((digest) => [digest.traceId, digest]));

      for (const trace of block.traces) {
        const digest = digestByTraceId.get(trace.id);
        if (trace.traceType === 'tool_result' && digest) {
          const digestLine = `Tool result digest from ${digest.toolName ?? 'unknown_tool'} (${digest.status}): ${digest.summary}`;
          lines.push(clampRenderedLine(digestLine, maxItemChars));
          continue;
        }
        lines.push(formatRawTrace(trace, maxItemChars));
      }
    }

    return lines;
  }
}
