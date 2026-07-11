import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import type { RawTraceItem } from '../models/raw-trace-item.js';
import { createToolCallIdentity, toolCallIdentityKey } from '../models/tool-call-identity.js';
import { ToolInteractionStatus, type ToolInteraction } from '../models/tool-interaction.js';
import { buildToolInteractions } from '../tool-interaction-builder.js';
import type { InteractionBlock } from './interaction-block.js';

export type CompactionTaskPromptBuildOptions = {
  maxItemChars?: number | null;
};

export const COMPACTION_RESULT_SHAPE = [
  'Your final answer must be one JSON object with this shape:',
  '{',
  '  "episodic_summary": "string",',
  '  "critical_issues": [{ "fact": "string" }],',
  '  "unresolved_work": [{ "fact": "string" }],',
  '  "durable_facts": [{ "fact": "string" }],',
  '  "user_preferences": [{ "fact": "string" }],',
  '  "important_artifacts": [{ "fact": "string" }]',
  '}',
  'Do not add Markdown fences or any text outside the JSON object.'
].join('\n');

const safeStringify = (value: unknown): string => formatToCleanString(value);

const renderToolCallId = (toolCallId: string | null | undefined): string | null => {
  const normalized = toolCallId?.trim();
  return normalized ? normalized : null;
};

const formatRawTrace = (trace: RawTraceItem, maxItemChars?: number | null): string => {
  let line: string;
  if (trace.traceType === 'tool_call') {
    const toolCallId = renderToolCallId(trace.toolCallId);
    line = toolCallId
      ? `Tool interaction ${toolCallId} request: ${safeStringify(trace.toolName ?? 'unknown_tool')} with arguments ${safeStringify(trace.toolArgs ?? {})}.`
      : `Tool request from ${safeStringify(trace.toolName ?? 'unknown_tool')} with arguments ${safeStringify(trace.toolArgs ?? {})}.`;
  } else if (trace.traceType === 'tool_result') {
    const toolCallId = renderToolCallId(trace.toolCallId);
    line = toolCallId
      ? `Tool result for call ${toolCallId} from ${safeStringify(trace.toolName ?? 'unknown_tool')}: ${safeStringify(trace.toolError ?? trace.toolResult)}`
      : `Tool result from ${safeStringify(trace.toolName ?? 'unknown_tool')}: ${safeStringify(trace.toolError ?? trace.toolResult)}`;
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
      'Summarize the earlier conversation history below so the same work can continue after a context refresh.',
      'Use the required final JSON shape exactly.',
      'Focus on useful conversation facts; omit bookkeeping identifiers and low-level event details.',
      '',
      '[REQUIRED_FINAL_JSON_SHAPE]',
      COMPACTION_RESULT_SHAPE,
      '',
      '[CONVERSATION_HISTORY_TO_SUMMARIZE]',
      ...this.renderBlocks(blocks, options.maxItemChars),
    ].join('\n');
  }

  private renderBlocks(blocks: InteractionBlock[], maxItemChars?: number | null): string[] {
    const lines: string[] = [];

    for (const block of blocks) {
      const digestByTraceId = new Map(block.toolResultDigests.map((digest) => [digest.traceId, digest]));
      const interactions = block.toolInteractions ?? buildToolInteractions(block.traces);
      const interactionByIdentity = new Map(interactions.map((interaction) => [
        toolCallIdentityKey({ turnId: interaction.turnId!, toolCallId: interaction.toolCallId }),
        interaction,
      ]));
      const renderedToolIdentities = new Set<string>();

      for (const trace of block.traces) {
        if (trace.traceType === 'tool_call' || trace.traceType === 'tool_result') {
          const identity = createToolCallIdentity(trace.turnId, trace.toolCallId);
          const key = identity ? toolCallIdentityKey(identity) : null;
          if (!key || renderedToolIdentities.has(key)) continue;
          renderedToolIdentities.add(key);
          const interaction = interactionByIdentity.get(key);
          if (interaction) {
            const digest = interaction.terminalRawTraceId
              ? digestByTraceId.get(interaction.terminalRawTraceId)
              : undefined;
            lines.push(this.formatInteraction(interaction, digest?.summary ?? null, maxItemChars));
          }
          continue;
        }
        lines.push(formatRawTrace(trace, maxItemChars));
      }
    }

    return lines;
  }

  private formatInteraction(
    interaction: ToolInteraction,
    terminalSummary: string | null,
    maxItemChars?: number | null,
  ): string {
    const callId = renderToolCallId(interaction.toolCallId);
    const request = `Tool interaction${callId ? ` ${callId}` : ''} from ${safeStringify(interaction.toolName ?? 'unknown_tool')} with arguments ${safeStringify(interaction.arguments ?? {})}`;
    if (interaction.status === ToolInteractionStatus.PENDING) {
      return clampRenderedLine(`${request} is pending.`, maxItemChars);
    }
    const outcome = terminalSummary ?? safeStringify(interaction.error ?? interaction.result);
    return clampRenderedLine(`${request} (${interaction.status}): ${outcome}`, maxItemChars);
  }
}
