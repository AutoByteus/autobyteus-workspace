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
  lineageStore: null,
  lineageScope: null,
  snapshotStore: null,
  agentId: 'agent-1',
  getContext: () => new WorkingContext(),
  installContext: () => undefined,
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
      turnOrigin: 'agent',
    })).toMatchObject({
      authorized: true,
      authorization: 'automatic_initial',
      request: { attemptState: { kind: 'attempt_in_progress' } },
    });
    expect(subject.beginPendingAttempt({
      operationId,
      turnId: 'turn-agent',
      turnOrigin: 'agent',
    })).toEqual({ authorized: false, code: 'attempt_in_progress' });
  });

  it('retains failure and authorizes only one distinct USER-origin retry', () => {
    const subject = coordinator();
    const operationId = subject.request({
      requestedTurnId: 'turn-initial',
      requestKind: 'hard_input_cap',
      planningBudget: planningBudget(615_744),
    });
    expect(subject.beginPendingAttempt({
      operationId,
      turnId: 'turn-initial',
      turnOrigin: 'system',
    }).authorized).toBe(true);
    subject.retainFailure(operationId, 'turn-initial', 'runner_timeout');
    expect(subject.getPendingGate()).toMatchObject({ kind: 'awaiting_user_retry', operationId });
    expect(subject.beginPendingAttempt({
      operationId,
      turnId: 'turn-agent',
      turnOrigin: 'agent',
    })).toEqual({ authorized: false, code: 'user_retry_required' });
    expect(subject.beginPendingAttempt({
      operationId,
      turnId: 'turn-initial',
      turnOrigin: 'user',
    })).toEqual({ authorized: false, code: 'same_turn_retry' });
    expect(subject.beginPendingAttempt({
      operationId,
      turnId: 'turn-user',
      turnOrigin: 'user',
    })).toMatchObject({ authorized: true, authorization: 'user_retry' });
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
