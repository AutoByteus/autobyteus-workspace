import { MessageRole, ToolCallPayload, ToolResultPayload } from '../../llm/utils/messages.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import { COMPACTION_OUTPUT_CONTRACT } from './compaction-task-prompt-builder.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export type WorkingContextCompactionPromptBuildOptions = {
  maxItemChars?: number | null;
};

export class WorkingContextCompactionPromptBuilder {
  buildTaskPrompt(
    units: WorkingContextMessageUnit[],
    options: WorkingContextCompactionPromptBuildOptions = {},
  ): string {
    return [
      'Compact the settled working-context transcript below into durable AutoByteus memory.',
      'The transcript is already LLM-facing history; preserve user goals, decisions, progress, findings, artifacts, open questions, and next steps.',
      'Do not mention runtime internals such as turn ids, raw trace ids, sequence numbers, source events, or block ids.',
      '',
      '[OUTPUT_CONTRACT]',
      COMPACTION_OUTPUT_CONTRACT,
      '',
      '[WORKING_CONTEXT_TRANSCRIPT]',
      ...this.renderUnits(units, options.maxItemChars),
    ].join('\n');
  }

  private renderUnits(units: WorkingContextMessageUnit[], maxItemChars?: number | null): string[] {
    const lines: string[] = [];
    for (const unit of units) {
      for (const message of unit.messages) {
        if (message.tool_payload instanceof ToolCallPayload) {
          this.renderAssistantEnvelope(message.reasoning_content, message.content, maxItemChars)
            .forEach((line) => lines.push(line));
          for (const call of message.tool_payload.toolCalls) {
            lines.push(clampRenderedLine(
              `Assistant requested tool ${call.name} (ID: ${call.id}) with arguments ${formatToCleanString(call.arguments)}.`,
              maxItemChars,
            ));
          }
          continue;
        }
        if (message.tool_payload instanceof ToolResultPayload) {
          const resultText = message.tool_payload.toolError
            ? `Error: ${message.tool_payload.toolError}`
            : formatToCleanString(message.tool_payload.toolResult);
          lines.push(clampRenderedLine(
            `Tool result from ${message.tool_payload.toolName}: ${resultText}`,
            maxItemChars,
          ));
          continue;
        }

        const role = this.renderRole(message.role);
        const content = [message.reasoning_content, message.content]
          .filter((part): part is string => Boolean(part?.trim()))
          .join('\n');
        if (content.trim()) {
          lines.push(clampRenderedLine(`${role}: ${content}`, maxItemChars));
        }
      }
    }
    return lines.length ? lines : ['No settled transcript content was available.'];
  }

  private renderRole(role: MessageRole): string {
    if (role === MessageRole.USER) return 'User';
    if (role === MessageRole.ASSISTANT) return 'Assistant';
    if (role === MessageRole.SYSTEM) return 'System';
    return 'Tool';
  }

  private renderAssistantEnvelope(
    reasoning: string | null | undefined,
    content: string | null | undefined,
    maxItemChars?: number | null,
  ): string[] {
    const lines: string[] = [];
    if (reasoning?.trim()) {
      lines.push(clampRenderedLine(`Assistant reasoning: ${reasoning}`, maxItemChars));
    }
    if (content?.trim()) {
      lines.push(clampRenderedLine(`Assistant: ${content}`, maxItemChars));
    }
    return lines;
  }
}
