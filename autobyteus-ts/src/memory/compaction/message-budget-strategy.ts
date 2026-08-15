import type { Message } from '../../llm/utils/messages.js';
import { ToolCallPayload, ToolResultPayload } from '../../llm/utils/messages.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import type { CompactionPlanningBudget } from './compaction-planning-budget.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export type MessageBudgetStrategyInput = {
  units: WorkingContextMessageUnit[];
  protectedSuffixUnits: WorkingContextMessageUnit[];
  planningBudget: CompactionPlanningBudget;
};

export type MessageBudgetStrategyResult = {
  costByUnitId: Record<string, number>;
  estimatedCurrentWorkingContextTokens: number;
  estimatedUntrackedOverheadTokens: number;
  requiredSystemTokens: number;
  protectedSuffixTokens: number;
  replacementMemoryReserveTokens: number;
  recentSuffixBudgetTokens: number;
};

export interface MessageBudgetStrategy {
  calculate(input: MessageBudgetStrategyInput): MessageBudgetStrategyResult;
}

export class EstimatedMessageBudgetStrategy implements MessageBudgetStrategy {
  calculate(input: MessageBudgetStrategyInput): MessageBudgetStrategyResult {
    const costByUnitId: Record<string, number> = {};
    for (const unit of input.units) costByUnitId[unit.id] = estimateUnitTokens(unit);
    const estimatedCurrentWorkingContextTokens = sumUnitCosts(input.units, costByUnitId);
    const estimatedUntrackedOverheadTokens = Math.max(
      0,
      input.planningBudget.observedPromptTokens - estimatedCurrentWorkingContextTokens,
    );
    const requiredSystemTokens = sumUnitCosts(
      input.units.filter(({ kind }) => kind === 'system'),
      costByUnitId,
    );
    const protectedSuffixTokens = sumUnitCosts(input.protectedSuffixUnits, costByUnitId);
    const replacementMemoryReserveTokens = input.planningBudget.replacementMemoryReserveTokens;
    const mandatoryTokens = requiredSystemTokens
      + protectedSuffixTokens
      + estimatedUntrackedOverheadTokens
      + replacementMemoryReserveTokens;
    return {
      costByUnitId,
      estimatedCurrentWorkingContextTokens,
      estimatedUntrackedOverheadTokens,
      requiredSystemTokens,
      protectedSuffixTokens,
      replacementMemoryReserveTokens,
      recentSuffixBudgetTokens: Math.max(
        0,
        input.planningBudget.postCompactionTargetTokens - mandatoryTokens,
      ),
    };
  }
}

export const estimateUnitTokens = (unit: WorkingContextMessageUnit): number =>
  estimateMessagesTokens(unit.messages);

export const estimateMessagesTokens = (messages: readonly Message[]): number =>
  messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0);

const estimateMessageTokens = (message: Message): number => {
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
  return Math.max(16, Math.ceil(parts.join('\n').length / 4) + 12);
};

const sumUnitCosts = (
  units: readonly WorkingContextMessageUnit[],
  costByUnitId: Record<string, number>,
): number => units.reduce((sum, unit) => sum + (costByUnitId[unit.id] ?? 0), 0);
