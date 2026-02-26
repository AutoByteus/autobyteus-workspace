import { describe, expect, it } from 'vitest';
import {
  createPersonalSessionSyncPolicy,
  shouldContinuePolling,
} from '~/services/sessionSync/personalSessionStatusSyncPolicy';

describe('personalSessionStatusSyncPolicy', () => {
  it('returns default policy values', () => {
    const policy = createPersonalSessionSyncPolicy();
    expect(policy).toEqual({
      baseIntervalMs: 2000,
      maxIntervalMs: 5000,
      timeoutMs: 120000,
      maxConsecutiveErrors: 5,
    });
  });

  it('stops polling when session reaches ACTIVE', () => {
    const policy = createPersonalSessionSyncPolicy();
    const decision = shouldContinuePolling(policy, {
      status: 'ACTIVE',
      elapsedMs: 1000,
      consecutiveErrors: 0,
    });
    expect(decision.shouldContinue).toBe(false);
    expect(decision.reason).toBe('active');
  });

  it('stops polling when timeout is reached', () => {
    const policy = createPersonalSessionSyncPolicy();
    const decision = shouldContinuePolling(policy, {
      status: 'PENDING_QR',
      elapsedMs: policy.timeoutMs,
      consecutiveErrors: 0,
    });
    expect(decision.shouldContinue).toBe(false);
    expect(decision.reason).toBe('timeout');
  });

  it('applies backoff and stops after retry budget is exhausted', () => {
    const policy = createPersonalSessionSyncPolicy();

    const retryDecision = shouldContinuePolling(policy, {
      elapsedMs: 1000,
      consecutiveErrors: 2,
    });
    expect(retryDecision.shouldContinue).toBe(true);
    expect(retryDecision.nextDelayMs).toBe(5000);

    const stopDecision = shouldContinuePolling(policy, {
      elapsedMs: 1000,
      consecutiveErrors: policy.maxConsecutiveErrors,
    });
    expect(stopDecision.shouldContinue).toBe(false);
    expect(stopDecision.reason).toBe('retry_budget_exhausted');
  });
});
