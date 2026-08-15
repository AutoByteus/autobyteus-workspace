import { describe, expect, it } from 'vitest';
import { resolveCompactionPlanningBudget } from '../../../src/memory/compaction/compaction-planning-budget.js';
import {
  CompactionThresholdGate,
  type CompactionThresholdEpisode,
} from '../../../src/memory/compaction/compaction-threshold-gate.js';

const budget = (observedPromptTokens: number, triggerThresholdTokens = 1_000) =>
  resolveCompactionPlanningBudget(
    { inputBudget: 5_000, triggerThresholdTokens },
    observedPromptTokens,
  );

const acceptedEpisode = (): CompactionThresholdEpisode => ({
  kind: 'awaiting_below_observation',
  budgetKey: budget(1_200).budgetKey,
  completedOperationId: 'operation-1',
  postCompactionTargetTokens: budget(1_200).postCompactionTargetTokens,
});

describe('CompactionThresholdGate', () => {
  const gate = new CompactionThresholdGate();

  it('requests one initial proactive crossing and leaves below-trigger ready observations alone', () => {
    expect(gate.evaluate({
      episode: { kind: 'ready' },
      planningBudget: budget(900),
      pressure: 'none',
    }).action).toBe('none');
    expect(gate.evaluate({
      episode: { kind: 'ready' },
      planningBudget: budget(1_200),
      pressure: 'proactive',
    })).toMatchObject({ action: 'request', requestKind: 'threshold_crossing' });
  });

  it('rearms only on a fresh actual below-trigger observation', () => {
    expect(gate.evaluate({
      episode: acceptedEpisode(),
      planningBudget: budget(900),
      pressure: 'none',
    })).toEqual({ episode: { kind: 'ready' }, action: 'reset' });
  });

  it('emits one inadequate-reduction decision and then remains suppressed', () => {
    const first = gate.evaluate({
      episode: acceptedEpisode(),
      planningBudget: budget(1_200),
      pressure: 'proactive',
    });
    expect(first).toMatchObject({ action: 'suppress', diagnosticRequired: true });
    const repeated = gate.evaluate({
      episode: first.episode,
      planningBudget: budget(1_300),
      pressure: 'proactive',
    });
    expect(repeated).toMatchObject({ action: 'remain_suppressed' });
    expect(repeated.diagnosticRequired).toBeUndefined();
  });

  it('resets a changed budget key and lets hard-cap safety override suppression', () => {
    expect(gate.evaluate({
      episode: acceptedEpisode(),
      planningBudget: budget(1_300, 1_100),
      pressure: 'proactive',
    })).toMatchObject({ action: 'request', requestKind: 'threshold_crossing' });
    expect(gate.evaluate({
      episode: acceptedEpisode(),
      planningBudget: budget(5_000),
      pressure: 'hard_input_cap',
    })).toMatchObject({ action: 'request', requestKind: 'hard_input_cap' });
  });
});
