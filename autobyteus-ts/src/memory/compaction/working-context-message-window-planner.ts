import type { Message } from '../../llm/utils/messages.js';
import {
  EstimatedMessageBudgetStrategy,
  type MessageBudgetStrategy,
} from './message-budget-strategy.js';
import { WorkingContextMessageUnitBuilder } from './working-context-message-unit-builder.js';
import type {
  MessageCompactionPlan,
  WorkingContextMessageUnit,
} from './working-context-message-unit.js';

export type WorkingContextMessageWindowPlannerInput = {
  messages: Message[];
  inputBudgetTokens?: number | null;
  minRecentNaturalUnits?: number;
};

export class WorkingContextMessageWindowPlanner {
  constructor(
    private readonly unitBuilder: WorkingContextMessageUnitBuilder = new WorkingContextMessageUnitBuilder(),
    private readonly budgetStrategy: MessageBudgetStrategy = new EstimatedMessageBudgetStrategy(),
  ) {}

  plan(input: WorkingContextMessageWindowPlannerInput): MessageCompactionPlan {
    const units = this.unitBuilder.build(input.messages);
    const budget = this.budgetStrategy.calculate({
      units,
      inputBudgetTokens: input.inputBudgetTokens ?? null,
    });
    const protectedSuffixUnits = this.resolveProtectedSuffixUnits(units);
    const protectedIds = new Set(protectedSuffixUnits.map((unit) => unit.id));
    const retainedCandidateUnits = units.filter((unit) =>
      unit.kind !== 'system' &&
      unit.kind !== 'compacted_memory' &&
      !protectedIds.has(unit.id)
    );

    const minRecentNaturalUnits = input.minRecentNaturalUnits ?? 4;
    const recentSuffixBudgetTokens = Math.max(
      0,
      budget.recentSuffixBudgetTokens - this.sumCosts(protectedSuffixUnits, budget.costByUnitId),
    );
    const retainedRecentUnits = this.enforceBudgetAndCompactablePrefix(
      retainedCandidateUnits,
      this.selectRecentSuffix(
        retainedCandidateUnits,
        budget.costByUnitId,
        recentSuffixBudgetTokens,
        minRecentNaturalUnits,
      ),
      budget.costByUnitId,
      recentSuffixBudgetTokens,
      minRecentNaturalUnits,
    );
    const retainedIds = new Set([
      ...retainedRecentUnits.map((unit) => unit.id),
      ...protectedIds,
    ]);
    const compactableUnits = units.filter((unit) =>
      unit.kind !== 'system'
      && !protectedIds.has(unit.id)
      && !retainedIds.has(unit.id));
    const retainedUnits = units.filter((unit) => retainedIds.has(unit.id));

    return {
      units,
      compactableUnits,
      retainedUnits,
      protectedSuffixUnits,
      retainedMessages: retainedUnits.flatMap((unit) => unit.messages),
      rawTraceIdsToArchive: [...new Set(compactableUnits.flatMap((unit) => unit.rawTraceIds))],
      estimatedRetainedTokens: this.sumCosts(retainedUnits, budget.costByUnitId),
      estimatedCompactedTokens: this.sumCosts(compactableUnits, budget.costByUnitId),
    };
  }

  private resolveProtectedSuffixUnits(units: WorkingContextMessageUnit[]): WorkingContextMessageUnit[] {
    const lastUnit = units[units.length - 1];
    return lastUnit?.kind === 'tool_protocol_group' ? [lastUnit] : [];
  }

  private selectRecentSuffix(
    candidates: WorkingContextMessageUnit[],
    costByUnitId: Record<string, number>,
    requestedBudgetTokens: number,
    minRecentUnits: number,
  ): WorkingContextMessageUnit[] {
    const retained: WorkingContextMessageUnit[] = [];
    let remainingBudget = Math.max(0, requestedBudgetTokens);

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const unit = candidates[index];
      const cost = costByUnitId[unit.id] ?? 0;
      const underFloor = retained.length < minRecentUnits;
      if (!underFloor && cost > remainingBudget) {
        break;
      }
      retained.unshift(unit);
      remainingBudget -= cost;
    }

    return retained;
  }

  private enforceBudgetAndCompactablePrefix(
    candidates: WorkingContextMessageUnit[],
    retained: WorkingContextMessageUnit[],
    costByUnitId: Record<string, number>,
    budgetTokens: number,
    minRecentUnits: number,
  ): WorkingContextMessageUnit[] {
    let trimmed = [...retained];
    while (trimmed.length > 0 && this.sumCosts(trimmed, costByUnitId) > budgetTokens) {
      trimmed = trimmed.slice(1);
    }
    if (trimmed.length < candidates.length) {
      return trimmed;
    }
    const retainedSuffixLength = Math.max(0, Math.min(minRecentUnits, candidates.length - 1));
    return candidates.slice(candidates.length - retainedSuffixLength);
  }

  private sumCosts(units: WorkingContextMessageUnit[], costByUnitId: Record<string, number>): number {
    return units.reduce((sum, unit) => sum + (costByUnitId[unit.id] ?? 0), 0);
  }
}
