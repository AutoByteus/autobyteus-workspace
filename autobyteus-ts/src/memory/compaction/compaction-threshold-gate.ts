import type { CompactionPlanningBudget } from './compaction-planning-budget.js';

export type CompactionThresholdEpisode =
  | { kind: 'ready' }
  | {
      kind: 'awaiting_below_observation';
      budgetKey: string;
      completedOperationId: string;
      postCompactionTargetTokens: number;
    }
  | {
      kind: 'inadequate_reduction_suppressed';
      budgetKey: string;
      completedOperationId: string;
      postCompactionTargetTokens: number;
      firstObservedPromptTokens: number;
      diagnosticEmitted: true;
    };

export type CompactionPressure = 'none' | 'proactive' | 'hard_input_cap';

export type CompactionThresholdGateResult = Readonly<{
  episode: CompactionThresholdEpisode;
  action: 'none' | 'request' | 'reset' | 'suppress' | 'remain_suppressed';
  requestKind?: 'threshold_crossing' | 'hard_input_cap';
  diagnosticRequired?: boolean;
}>;

export class CompactionThresholdGate {
  evaluate(input: {
    episode: CompactionThresholdEpisode;
    planningBudget: CompactionPlanningBudget;
    pressure: CompactionPressure;
  }): CompactionThresholdGateResult {
    const { planningBudget, pressure } = input;
    let episode = copyCompactionThresholdEpisode(input.episode);
    const budgetChanged = episode.kind !== 'ready' && episode.budgetKey !== planningBudget.budgetKey;
    if (budgetChanged) episode = { kind: 'ready' };

    if (pressure === 'hard_input_cap') {
      return {
        episode,
        action: 'request',
        requestKind: 'hard_input_cap',
      };
    }

    if (episode.kind === 'ready') {
      if (pressure === 'proactive') {
        return {
          episode,
          action: 'request',
          requestKind: 'threshold_crossing',
        };
      }
      return { episode, action: budgetChanged ? 'reset' : 'none' };
    }

    if (planningBudget.observedPromptTokens < planningBudget.triggerThresholdTokens) {
      return { episode: { kind: 'ready' }, action: 'reset' };
    }

    if (episode.kind === 'awaiting_below_observation') {
      return {
        episode: {
          kind: 'inadequate_reduction_suppressed',
          budgetKey: episode.budgetKey,
          completedOperationId: episode.completedOperationId,
          postCompactionTargetTokens: episode.postCompactionTargetTokens,
          firstObservedPromptTokens: planningBudget.observedPromptTokens,
          diagnosticEmitted: true,
        },
        action: 'suppress',
        diagnosticRequired: true,
      };
    }

    return { episode, action: 'remain_suppressed' };
  }
}

export const copyCompactionThresholdEpisode = (
  episode: CompactionThresholdEpisode,
): CompactionThresholdEpisode => ({ ...episode });
