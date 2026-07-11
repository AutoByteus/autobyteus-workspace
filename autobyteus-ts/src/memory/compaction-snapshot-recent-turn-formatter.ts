import { RawTraceItem } from './models/raw-trace-item.js';
import { ToolInteractionStatus, type ToolInteraction } from './models/tool-interaction.js';
import { createToolCallIdentity, toolCallIdentityKey } from './models/tool-call-identity.js';
import { buildToolInteractions } from './tool-interaction-builder.js';
import type { ToolCallContext } from './tool-trace-lifecycle-index.js';

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
  format(
    rawTail: RawTraceItem[],
    maxItemChars?: number | null,
    callContextByIdentity: ReadonlyMap<string, ToolCallContext> = new Map(),
  ): string[] {
    const lines: string[] = [];
    const interactions = buildToolInteractions(rawTail, { callContextByIdentity });
    const byIdentity = new Map(interactions.map((interaction) => [
      toolCallIdentityKey({ turnId: interaction.turnId!, toolCallId: interaction.toolCallId }),
      interaction,
    ]));
    const renderedToolIdentities = new Set<string>();
    for (const item of rawTail) {
      if (item.traceType === 'tool_call' || item.traceType === 'tool_result') {
        const identity = createToolCallIdentity(item.turnId, item.toolCallId);
        if (!identity) {
          lines.push(this.formatRawTrace(item, maxItemChars));
          continue;
        }
        const key = toolCallIdentityKey(identity);
        if (renderedToolIdentities.has(key)) continue;
        renderedToolIdentities.add(key);
        const interaction = byIdentity.get(key);
        if (interaction) lines.push(this.formatInteraction(item, interaction, maxItemChars));
        continue;
      }
      lines.push(this.formatRawTrace(item, maxItemChars));
    }

    return lines;
  }

  private formatInteraction(
    trace: RawTraceItem,
    interaction: ToolInteraction,
    maxItemChars?: number | null,
  ): string {
    const prefix = `(${trace.turnId}:${trace.seq}) TOOL:`;
    const resultText = interaction.status === ToolInteractionStatus.PENDING
      ? 'pending'
      : interaction.status === ToolInteractionStatus.ERROR
        ? safeStringify(interaction.error ?? 'error')
        : safeStringify(interaction.result);
    return clampRenderedLine(
      `${prefix} ${safeStringify(interaction.toolName ?? 'unknown_tool')} ${safeStringify(interaction.arguments ?? {})} -> ${resultText}`,
      maxItemChars,
    );
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
