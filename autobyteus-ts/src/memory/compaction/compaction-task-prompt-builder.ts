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
  '  "critical_issues": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],',
  '  "unresolved_work": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],',
  '  "durable_facts": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],',
  '  "user_preferences": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],',
  '  "important_artifacts": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }]',
  '}',
  'The output contract is mandatory. Do not return prose outside the JSON object.'
].join('\n');

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

export class CompactionTaskPromptBuilder {
  buildTaskPrompt(blocks: InteractionBlock[], options: CompactionTaskPromptBuildOptions = {}): string {
    return [
      'Compact the following settled interaction blocks into episodic summary plus typed semantic memory.',
      'Keep the result concise, durable, and future-useful.',
      'Preserve key decisions, plans, constraints, created or modified files, important tool outcomes or failures, unresolved work, critical validation findings, and durable user preferences.',
      'Drop repeated chatter, low-value operational noise, process-count/status clutter, and verbose raw payloads that are not future-relevant.',
      '',
      COMPACTION_OUTPUT_CONTRACT,
      '',
      '[SETTLED_BLOCKS]',
      ...this.renderBlocks(blocks, options.maxItemChars),
    ].join('\n');
  }

  private renderBlocks(blocks: InteractionBlock[], maxItemChars?: number | null): string[] {
    const lines: string[] = [];

    for (const block of blocks) {
      lines.push(`[BLOCK ${block.blockId}] turn=${block.turnId ?? 'unknown'} kind=${block.blockKind}`);
      const digestByTraceId = new Map(block.toolResultDigests.map((digest) => [digest.traceId, digest]));

      for (const trace of block.traces) {
        const digest = digestByTraceId.get(trace.id);
        if (trace.traceType === 'tool_result' && digest) {
          const ref = digest.reference ? ` ref=${digest.reference}` : '';
          const digestLine = `(${trace.turnId}:${trace.seq}) TOOL_RESULT_DIGEST: ${digest.toolName ?? 'unknown_tool'} status=${digest.status}${ref} summary=${digest.summary}`;
          lines.push(clampRenderedLine(digestLine, maxItemChars));
          continue;
        }
        lines.push(formatRawTrace(trace, maxItemChars));
      }
    }

    return lines;
  }
}
