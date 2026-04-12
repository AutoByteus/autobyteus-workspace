import { RawTraceItem } from './models/raw-trace-item.js';
import { ToolInteractionStatus } from './models/tool-interaction.js';
import { buildToolInteractions } from './tool-interaction-builder.js';

export const RECENT_TURN_TRUNCATION_MARKER = ' …[truncated]';

const normalizeLineLimit = (maxItemChars: number | null | undefined): number | null => {
  if (typeof maxItemChars !== 'number' || !Number.isFinite(maxItemChars) || maxItemChars <= 0) {
    return null;
  }
  return Math.floor(maxItemChars);
};

const safeStringify = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return '';
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized !== undefined) {
      return serialized;
    }
  } catch (_error) {
    // Fall back to string conversion below.
  }

  return String(value);
};

export const clampRenderedLine = (line: string, maxItemChars: number | null | undefined): string => {
  const limit = normalizeLineLimit(maxItemChars);
  if (limit === null || line.length <= limit) {
    return line;
  }

  if (limit <= RECENT_TURN_TRUNCATION_MARKER.length) {
    return RECENT_TURN_TRUNCATION_MARKER.slice(0, limit);
  }

  return `${line.slice(0, limit - RECENT_TURN_TRUNCATION_MARKER.length)}${RECENT_TURN_TRUNCATION_MARKER}`;
};

export class CompactionSnapshotRecentTurnFormatter {
  format(rawTail: RawTraceItem[], maxItemChars?: number | null): string[] {
    const lines: string[] = [];
    const interactions = buildToolInteractions(rawTail);
    const interactionIds = new Set(interactions.map((interaction) => interaction.toolCallId));

    const firstTraceByCallId = new Map<string, RawTraceItem>();
    for (const item of rawTail) {
      if (item.toolCallId && !firstTraceByCallId.has(item.toolCallId)) {
        firstTraceByCallId.set(item.toolCallId, item);
      }
    }

    const sortedInteractions = [...interactions].sort((a, b) => {
      const firstA = firstTraceByCallId.get(a.toolCallId);
      const firstB = firstTraceByCallId.get(b.toolCallId);
      return (firstA?.seq ?? 0) - (firstB?.seq ?? 0);
    });

    for (const interaction of sortedInteractions) {
      const trace = firstTraceByCallId.get(interaction.toolCallId);
      const prefix = trace ? `(${trace.turnId}:${trace.seq}) TOOL:` : '(unknown) TOOL:';
      const toolName = safeStringify(interaction.toolName ?? 'unknown_tool');
      const argumentsText = safeStringify(interaction.arguments ?? {});

      let resultText: string;
      if (interaction.status === ToolInteractionStatus.PENDING) {
        resultText = 'pending';
      } else if (interaction.status === ToolInteractionStatus.ERROR) {
        resultText = safeStringify(interaction.error ?? 'error');
      } else {
        resultText = safeStringify(interaction.result);
      }

      const line = `${prefix} ${toolName} ${argumentsText} -> ${resultText}`;
      lines.push(clampRenderedLine(line, maxItemChars));
    }

    for (const item of rawTail) {
      if ((item.traceType === 'tool_call' || item.traceType === 'tool_result')
        && item.toolCallId
        && interactionIds.has(item.toolCallId)) {
        continue;
      }
      lines.push(this.formatRawTrace(item, maxItemChars));
    }

    return lines;
  }

  private formatRawTrace(item: RawTraceItem, maxItemChars?: number | null): string {
    const prefix = `(${item.turnId}:${item.seq}) ${item.traceType.toUpperCase()}:`;

    let line: string;
    if (item.traceType === 'tool_call') {
      line = `${prefix} ${safeStringify(item.toolName ?? 'unknown_tool')} ${safeStringify(item.toolArgs ?? {})}`;
    } else if (item.traceType === 'tool_result') {
      line = `${prefix} ${safeStringify(item.toolName ?? 'unknown_tool')} ${safeStringify(item.toolError ?? item.toolResult)}`;
    } else {
      line = `${prefix} ${safeStringify(item.content)}`;
    }

    return clampRenderedLine(line, maxItemChars);
  }
}
