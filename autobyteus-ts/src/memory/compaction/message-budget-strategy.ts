import { ToolCallPayload, ToolResultPayload } from '../../llm/utils/messages.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export type MessageBudgetStrategyInput = {
  units: WorkingContextMessageUnit[];
  inputBudgetTokens?: number | null;
};

export type MessageBudgetStrategyResult = {
  costByUnitId: Record<string, number>;
  recentSuffixBudgetTokens: number;
};

export interface MessageBudgetStrategy {
  calculate(input: MessageBudgetStrategyInput): MessageBudgetStrategyResult;
}

export class EstimatedMessageBudgetStrategy implements MessageBudgetStrategy {
  constructor(
    private readonly defaultRecentSuffixBudgetTokens = 1600,
    private readonly budgetFraction = 0.35,
  ) {}

  calculate(input: MessageBudgetStrategyInput): MessageBudgetStrategyResult {
    const costByUnitId: Record<string, number> = {};
    for (const unit of input.units) {
      costByUnitId[unit.id] = estimateUnitTokens(unit);
    }
    const fromBudget = input.inputBudgetTokens && input.inputBudgetTokens > 0
      ? Math.floor(input.inputBudgetTokens * this.budgetFraction)
      : this.defaultRecentSuffixBudgetTokens;
    return {
      costByUnitId,
      recentSuffixBudgetTokens: Math.max(256, fromBudget),
    };
  }
}

export const estimateUnitTokens = (unit: WorkingContextMessageUnit): number => {
  const rendered = unit.messages.map((message) => {
    const parts: string[] = [message.role];
    if (message.content) parts.push(message.content);
    if (message.reasoning_content) parts.push(message.reasoning_content);
    if (message.tool_payload instanceof ToolCallPayload) {
      parts.push(formatToCleanString(message.tool_payload.toolCalls));
    }
    if (message.tool_payload instanceof ToolResultPayload) {
      parts.push(formatToCleanString({
        toolName: message.tool_payload.toolName,
        toolResult: message.tool_payload.toolResult,
        toolError: message.tool_payload.toolError,
      }));
    }
    parts.push(...message.image_urls, ...message.audio_urls, ...message.video_urls);
    return parts.join('\n');
  }).join('\n');

  return Math.max(16, Math.ceil(rendered.length / 4) + 12);
};
