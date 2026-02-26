import { Message, MessageRole } from '../llm/utils/messages.js';
import { RawTraceItem } from './models/raw-trace-item.js';
import { MemoryBundle } from './retrieval/memory-bundle.js';
import { buildToolInteractions } from './tool-interaction-builder.js';
import { ToolInteractionStatus } from './models/tool-interaction.js';

export class CompactionSnapshotBuilder {
  build(systemPrompt: string, bundle: MemoryBundle, rawTail: RawTraceItem[]): Message[] {
    const parts: string[] = [];

    if (bundle.episodic.length) {
      parts.push('[MEMORY:EPISODIC]');
      bundle.episodic.forEach((item, idx) => {
        parts.push(`${idx + 1}) ${item.summary}`);
      });
      parts.push('');
    }

    if (bundle.semantic.length) {
      parts.push('[MEMORY:SEMANTIC]');
      bundle.semantic.forEach((item) => {
        parts.push(`- ${item.fact}`);
      });
      parts.push('');
    }

    if (rawTail.length) {
      parts.push('[RECENT TURNS]');
      parts.push(...this.formatRecentTurns(rawTail));
      parts.push('');
    }

    const summaryText = parts.join('\n').trim();
    const messages = [new Message(MessageRole.SYSTEM, { content: systemPrompt })];
    if (summaryText) {
      messages.push(new Message(MessageRole.USER, { content: summaryText }));
    }
    return messages;
  }

  private formatRecentTurns(rawTail: RawTraceItem[]): string[] {
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

      let resultText: unknown;
      if (interaction.status === ToolInteractionStatus.PENDING) {
        resultText = 'pending';
      } else if (interaction.status === ToolInteractionStatus.ERROR) {
        resultText = interaction.error ?? 'error';
      } else {
        resultText = interaction.result;
      }

      lines.push(`${prefix} ${interaction.toolName} ${interaction.arguments} -> ${resultText}`);
    }

    for (const item of rawTail) {
      if (item.traceType === 'tool_call' || item.traceType === 'tool_result') {
        if (item.toolCallId && interactionIds.has(item.toolCallId)) {
          continue;
        }
      }
      lines.push(this.formatRawTrace(item));
    }

    return lines;
  }

  private formatRawTrace(item: RawTraceItem): string {
    const prefix = `(${item.turnId}:${item.seq}) ${item.traceType.toUpperCase()}:`;
    if (item.traceType === 'tool_call') {
      return `${prefix} ${item.toolName} ${item.toolArgs}`;
    }
    if (item.traceType === 'tool_result') {
      const result = item.toolError ?? item.toolResult;
      return `${prefix} ${item.toolName} ${result}`;
    }
    return `${prefix} ${item.content}`;
  }
}
