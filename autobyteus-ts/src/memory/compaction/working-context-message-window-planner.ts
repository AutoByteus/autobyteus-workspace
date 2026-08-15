import type { Message } from '../../llm/utils/messages.js';
import type { CompactionPlanningBudget } from './compaction-planning-budget.js';
import {
  EstimatedMessageBudgetStrategy,
  type MessageBudgetStrategy,
} from './message-budget-strategy.js';
import { WorkingContextMessageUnitBuilder } from './working-context-message-unit-builder.js';
import type {
  MessageCompactionPlan,
  WorkingContextMessageUnit,
} from './working-context-message-unit.js';

export type CompactionPlanningFailureCode = 'target_unattainable' | 'no_compactable_prefix';

export class CompactionPlanningError extends Error {
  constructor(readonly code: CompactionPlanningFailureCode, message: string) {
    super(message);
    this.name = 'CompactionPlanningError';
  }
}

export type WorkingContextMessageWindowPlannerInput = {
  messages: Message[];
  planningBudget: CompactionPlanningBudget;
  minRecentNaturalUnits?: number;
};

export class WorkingContextMessageWindowPlanner {
  constructor(
    private readonly unitBuilder: WorkingContextMessageUnitBuilder = new WorkingContextMessageUnitBuilder(),
    private readonly budgetStrategy: MessageBudgetStrategy = new EstimatedMessageBudgetStrategy(),
  ) {}

  plan(input: WorkingContextMessageWindowPlannerInput): MessageCompactionPlan {
    const units = this.unitBuilder.build(input.messages);
    const protectedSuffixUnits = this.resolveProtectedSuffixUnits(units);
    const budget = this.budgetStrategy.calculate({
      units,
      protectedSuffixUnits,
      planningBudget: input.planningBudget,
    });
    const mandatoryTokens = budget.requiredSystemTokens
      + budget.protectedSuffixTokens
      + budget.estimatedUntrackedOverheadTokens
      + budget.replacementMemoryReserveTokens;
    if (
      input.planningBudget.postCompactionTargetTokens <= 0
      || mandatoryTokens >= input.planningBudget.postCompactionTargetTokens
    ) {
      throw new CompactionPlanningError(
        'target_unattainable',
        'Compaction target is unattainable because required context and reserves meet or exceed it.',
      );
    }

    const protectedIds = new Set(protectedSuffixUnits.map((unit) => unit.id));
    const retainedCandidateUnits = units.filter((unit) =>
      unit.kind !== 'system'
      && unit.kind !== 'compacted_memory'
      && !protectedIds.has(unit.id)
    );
    let retainedRecentUnits = this.selectRecentSuffix(
      retainedCandidateUnits,
      budget.costByUnitId,
      budget.recentSuffixBudgetTokens,
    );
    let partition = this.partition(units, protectedIds, retainedRecentUnits);
    while (
      !partition.compactableUnits.some((unit) => unit.rawTraceIds.length > 0)
      && retainedRecentUnits.length > 0
    ) {
      retainedRecentUnits = retainedRecentUnits.slice(1);
      partition = this.partition(units, protectedIds, retainedRecentUnits);
    }
    if (!partition.compactableUnits.some((unit) => unit.rawTraceIds.length > 0)) {
      throw new CompactionPlanningError(
        'no_compactable_prefix',
        'No settled natural working-context prefix with new raw traces can be compacted.',
      );
    }

    const retainedRecentTokens = this.sumCosts(retainedRecentUnits, budget.costByUnitId);
    const estimatedPlannedPromptTokens = mandatoryTokens + retainedRecentTokens;
    return {
      units,
      compactableUnits: partition.compactableUnits,
      retainedUnits: partition.retainedUnits,
      protectedSuffixUnits,
      retainedMessages: partition.retainedUnits.flatMap((unit) => unit.messages),
      rawTraceIdsToArchive: [
        ...new Set(partition.compactableUnits.flatMap((unit) => unit.rawTraceIds)),
      ],
      estimatedRetainedTokens: this.sumCosts(partition.retainedUnits, budget.costByUnitId),
      estimatedCompactedTokens: this.sumCosts(partition.compactableUnits, budget.costByUnitId),
      budgetAssessment: {
        planningBudget: input.planningBudget,
        estimatedCurrentWorkingContextTokens: budget.estimatedCurrentWorkingContextTokens,
        estimatedUntrackedOverheadTokens: budget.estimatedUntrackedOverheadTokens,
        requiredSystemTokens: budget.requiredSystemTokens,
        protectedSuffixTokens: budget.protectedSuffixTokens,
        replacementMemoryReserveTokens: budget.replacementMemoryReserveTokens,
        retainedRecentTokens,
        estimatedPlannedPromptTokens,
        estimatedFinalizedContextTokens: null,
      },
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
  ): WorkingContextMessageUnit[] {
    const retained: WorkingContextMessageUnit[] = [];
    let remainingBudget = Math.max(0, requestedBudgetTokens);
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const unit = candidates[index]!;
      const cost = costByUnitId[unit.id] ?? 0;
      if (cost > remainingBudget) break;
      retained.unshift(unit);
      remainingBudget -= cost;
    }
    return retained;
  }

  private partition(
    units: WorkingContextMessageUnit[],
    protectedIds: Set<string>,
    retainedRecentUnits: WorkingContextMessageUnit[],
  ): { compactableUnits: WorkingContextMessageUnit[]; retainedUnits: WorkingContextMessageUnit[] } {
    const retainedIds = new Set([
      ...retainedRecentUnits.map((unit) => unit.id),
      ...protectedIds,
    ]);
    return {
      compactableUnits: units.filter((unit) =>
        unit.kind !== 'system'
        && !protectedIds.has(unit.id)
        && !retainedIds.has(unit.id)),
      retainedUnits: units.filter((unit) => retainedIds.has(unit.id)),
    };
  }

  private sumCosts(units: WorkingContextMessageUnit[], costByUnitId: Record<string, number>): number {
    return units.reduce((sum, unit) => sum + (costByUnitId[unit.id] ?? 0), 0);
  }
}
