import { describe, expect, it } from 'vitest';
import { resolveCompactionPlanningBudget } from '../../../src/memory/compaction/compaction-planning-budget.js';
import { MemoryManagerCompactionCoordinator } from '../../../src/memory/memory-manager-compaction-coordinator.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

const planningBudget = (observedPromptTokens = 249_416) =>
  resolveCompactionPlanningBudget(
    { inputBudget: 615_744, triggerThresholdTokens: 123_148 },
    observedPromptTokens,
  );

const coordinator = () => new MemoryManagerCompactionCoordinator({
  store: {} as any,
  snapshotStore: null,
  agentId: 'agent-1',
  contextController: { getContext: () => new WorkingContext(), installOwned: () => undefined } as any,
});

describe('MemoryManagerCompactionCoordinator attempt authorization', () => {
  it('creates one immutable trigger-time plan and permits the automatic initial attempt for any origin', () => {
    const subject = coordinator();
    const decision = subject.evaluateObservation({
      requestedTurnId: 'turn-agent',
      planningBudget: planningBudget(),
      pressure: 'proactive',
    });
    expect(decision).toMatchObject({
      kind: 'requested',
      requestKind: 'threshold_crossing',
      planningBudget: { postCompactionTargetTokens: 110_833 },
    });
    const operationId = decision.operationId!;
    expect(subject.beginPendingAttempt({
      operationId,
      turnId: 'turn-agent',

    })).toMatchObject({
      authorized: true,
      authorization: 'automatic_initial',
      request: { attemptState: { kind: 'attempt_in_progress' } },
    });
    expect(subject.beginPendingAttempt({
      operationId,
      turnId: 'turn-agent',

    })).toEqual({ authorized: false, code: 'attempt_in_progress' });
  });

  it.each(['before_parent_request', 'after_final_response'] as const)('gates %s by exact one-use permission, not origin/different-turn proxy', site => {
    const subject = coordinator();
    const operationId = subject.request({ requestedTurnId: 'A', requestKind: 'hard_input_cap', planningBudget: planningBudget(615744) });
    const begin = (turnId: string | 'agent' = 'user') => subject.beginPendingAttempt({ operationId, turnId });
    expect(begin('A').authorized).toBe(true);
    subject.retainFailure(operationId, 'A', 'generation_failure', site);
    const block = subject.getRecovery()!;
    expect(block.position.kind).toBe(site === 'before_parent_request' ? 'held_turn' : 'next_turn');
    expect(subject.canStartTurn()).toBe(false);
    expect(begin('A')).toMatchObject({ authorized: false, code: 'user_retry_required' });
    expect(begin('B')).toMatchObject({ authorized: false, code: 'user_retry_required' });
    expect(subject.authorizeRetry({ block: { ...block, failureEpoch: 999 }, userAdmissionId: 'B' })).toBe('stale');
    expect(subject.authorizeRetry({ block, userAdmissionId: 'B' })).toBe('accepted');
    expect(subject.authorizeRetry({ block, userAdmissionId: 'C' })).toBe('stale');
    if (site === 'after_final_response') {
      subject.retireTurn('A'); // Consumed A completion preserves an already-accepted next grant.
      expect(subject.getRecovery()).toMatchObject({ failureEpoch: block.failureEpoch, state: 'authorized' });
      expect(subject.canStartTurn()).toBe(true); expect(subject.bindRetryTurn('B')).toBe(true);
      expect(subject.canStartTurn()).toBe(false); expect(begin('C').authorized).toBe(false);
      expect(begin('B').authorized).toBe(true); // Permission, not selected head's origin.
    } else {
      expect(subject.canStartTurn()).toBe(false); expect(begin('B').authorized).toBe(false);
      expect(begin('A').authorized).toBe(true);
    }
    const turn = site === 'before_parent_request' ? 'A' : 'B';
    subject.retainFailure(operationId, turn, 'again', 'before_parent_request');
    expect(subject.getRecovery()!.failureEpoch).toBeGreaterThan(block.failureEpoch);
    expect(subject.authorizeRetry({ block, userAdmissionId: 'late' })).toBe('stale');
    expect(begin(turn).authorized).toBe(false);
  });

  it('revokes only exact unused next-turn permission and fences pre-executor failure', () => {
    const subject = coordinator(); const operationId = subject.request({ requestKind: 'hard_input_cap', planningBudget: planningBudget() });
    subject.beginPendingAttempt({ operationId, turnId: 'A' });
    subject.retainFailure(operationId, 'A', 'failed', 'after_final_response');
    let block = subject.getRecovery()!;
    subject.authorizeRetry({ block, userAdmissionId: 'C' });
    expect(subject.revokeUnusedRetry({ block, userAdmissionId: 'wrong' })).toBe('stale');
    expect(subject.revokeUnusedRetry({ block, userAdmissionId: 'C' })).toBe('revoked');
    expect(subject.canStartTurn()).toBe(false);
    block = subject.getRecovery()!; subject.authorizeRetry({ block, userAdmissionId: 'D' });
    subject.bindRetryTurn('B');
    expect(subject.revokeUnusedRetry({ block, userAdmissionId: 'D' })).toBe('in_use');
    subject.retireTurn('B');
    expect(subject.getRecovery()).toMatchObject({ state: 'awaiting_user', position: { kind: 'next_turn', failedTurnId: 'B' } });
    expect(subject.canStartTurn()).toBe(false);
  });

  it('copies pending planning and attempt state without aliasing', () => {
    const subject = coordinator();
    subject.request({
      requestKind: 'threshold_crossing',
      planningBudget: planningBudget(),
    });
    const state = subject.captureState();
    (state.pendingCompactionRequest!.attemptState as any).kind = 'awaiting_user_retry';
    expect(Object.isFrozen(state.pendingCompactionRequest!.planningBudget)).toBe(true);
    expect(subject.getPending()).toMatchObject({
      attemptState: { kind: 'initial_attempt_ready' },
      planningBudget: { postCompactionTargetTokens: 110_833 },
    });
  });
});
