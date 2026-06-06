import { MessageRole, ToolCallPayload, ToolResultPayload } from '../../llm/utils/messages.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { clampRenderedLine } from '../compaction-snapshot-recent-turn-formatter.js';
import { COMPACTION_RESULT_SHAPE } from './compaction-task-prompt-builder.js';
import type {
  ToolProtocolMessageUnit,
  WorkingContextMessageUnit,
} from './working-context-message-unit.js';

export type WorkingContextCompactionPromptBuildOptions = {
  maxItemChars?: number | null;
};

export class WorkingContextCompactionPromptBuilder {
  buildTaskPrompt(
    units: WorkingContextMessageUnit[],
    options: WorkingContextCompactionPromptBuildOptions = {},
  ): string {
    return [
      'Summarize the earlier conversation history below so the same work can continue after a context refresh.',
      'Preserve user goals, decisions, progress, findings, artifacts, tool outcomes, open questions, and next steps.',
      'Focus on useful conversation facts; omit bookkeeping identifiers and low-level event details.',
      '',
      '[REQUIRED_FINAL_JSON_SHAPE]',
      COMPACTION_RESULT_SHAPE,
      '',
      '[CONVERSATION_HISTORY_TO_SUMMARIZE]',
      ...this.renderUnits(units, options.maxItemChars),
    ].join('\n');
  }

  private renderUnits(units: WorkingContextMessageUnit[], maxItemChars?: number | null): string[] {
    const lines: string[] = [];
    for (const unit of units) {
      if (unit.kind === 'tool_protocol_group') {
        this.renderToolProtocolGroup(unit, maxItemChars).forEach((line) => lines.push(line));
        continue;
      }
      for (const message of unit.messages) {
        this.renderMessage(message, maxItemChars).forEach((line) => lines.push(line));
      }
    }
    return lines.length ? lines : ['No earlier conversation content was available.'];
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
      lines.push(clampRenderedLine(`Assistant work notes: ${reasoning}`, maxItemChars));
    }
    if (content?.trim()) {
      lines.push(clampRenderedLine(`Assistant: ${content}`, maxItemChars));
    }
    return lines;
  }

  private renderMessage(
    message: WorkingContextMessageUnit['messages'][number],
    maxItemChars?: number | null,
  ): string[] {
    if (message.tool_payload instanceof ToolCallPayload) {
      return this.renderToolCallMessage(message.reasoning_content, message.content, message.tool_payload, maxItemChars);
    }
    if (message.tool_payload instanceof ToolResultPayload) {
      return [this.renderToolResult(message.tool_payload, maxItemChars, true)];
    }

    if (message.role === MessageRole.ASSISTANT) {
      return this.renderAssistantEnvelope(message.reasoning_content, message.content, maxItemChars);
    }

    const role = this.renderRole(message.role);
    const content = [message.reasoning_content, message.content]
      .filter((part): part is string => Boolean(part?.trim()))
      .join('\n');
    return content.trim()
      ? [clampRenderedLine(`${role}: ${content}`, maxItemChars)]
      : [];
  }

  private renderToolCallMessage(
    reasoning: string | null | undefined,
    content: string | null | undefined,
    payload: ToolCallPayload,
    maxItemChars?: number | null,
  ): string[] {
    const lines = this.renderAssistantEnvelope(reasoning, content, maxItemChars);
    for (const call of payload.toolCalls) {
      lines.push(clampRenderedLine(
        `Tool interaction ${call.id}:`,
        maxItemChars,
      ));
      lines.push(clampRenderedLine(
        `- Request for call ${call.id}: ${call.name} with arguments ${formatToCleanString(call.arguments)}.`,
        maxItemChars,
      ));
    }
    return lines;
  }

  private renderToolProtocolGroup(
    unit: ToolProtocolMessageUnit,
    maxItemChars?: number | null,
  ): string[] {
    const assistantMessage = unit.messages.find((message) => message.tool_payload instanceof ToolCallPayload);
    if (!assistantMessage || !(assistantMessage.tool_payload instanceof ToolCallPayload)) {
      return unit.messages.flatMap((message) => this.renderMessage(message, maxItemChars));
    }

    const lines = this.renderAssistantEnvelope(
      assistantMessage.reasoning_content,
      assistantMessage.content,
      maxItemChars,
    );
    const calls = assistantMessage.tool_payload.toolCalls;
    const callIds = new Set(calls.map((call) => call.id));
    const resultsByCallId = new Map<string, ToolResultPayload[]>();
    const unmatchedResults: ToolResultPayload[] = [];

    for (const message of unit.messages) {
      if (!(message.tool_payload instanceof ToolResultPayload)) {
        continue;
      }
      const resultPayload = message.tool_payload;
      if (!callIds.has(resultPayload.toolCallId)) {
        unmatchedResults.push(resultPayload);
        continue;
      }
      const results = resultsByCallId.get(resultPayload.toolCallId) ?? [];
      results.push(resultPayload);
      resultsByCallId.set(resultPayload.toolCallId, results);
    }

    for (const call of calls) {
      lines.push(clampRenderedLine(
        `Tool interaction ${call.id}:`,
        maxItemChars,
      ));
      lines.push(clampRenderedLine(
        `- Request for call ${call.id}: ${call.name} with arguments ${formatToCleanString(call.arguments)}.`,
        maxItemChars,
      ));
      for (const result of resultsByCallId.get(call.id) ?? []) {
        lines.push(this.renderToolResult(result, maxItemChars, false));
      }
    }

    for (const result of unmatchedResults) {
      lines.push(this.renderToolResult(result, maxItemChars, true));
    }

    return lines;
  }

  private renderToolResult(
    payload: ToolResultPayload,
    maxItemChars?: number | null,
    unmatched = false,
  ): string {
    const resultText = payload.toolError
      ? `Error: ${payload.toolError}`
      : formatToCleanString(payload.toolResult);
    const prefix = unmatched
      ? `Unmatched tool result for call ${payload.toolCallId} from ${payload.toolName}`
      : `- Result for call ${payload.toolCallId} from ${payload.toolName}`;
    return clampRenderedLine(`${prefix}: ${resultText}`, maxItemChars);
  }
}
