import type { PersonalSessionStatus } from '~/types/messaging';

export interface PersonalSessionStatusSyncPolicy {
  baseIntervalMs: number;
  maxIntervalMs: number;
  timeoutMs: number;
  maxConsecutiveErrors: number;
}

export interface PersonalSessionStatusSyncDecision {
  shouldContinue: boolean;
  nextDelayMs: number;
  reason?: string;
}

export interface PersonalSessionStatusSyncInput {
  status?: PersonalSessionStatus;
  elapsedMs: number;
  consecutiveErrors: number;
}

const DEFAULT_POLICY: PersonalSessionStatusSyncPolicy = {
  baseIntervalMs: 2000,
  maxIntervalMs: 5000,
  timeoutMs: 120000,
  maxConsecutiveErrors: 5,
};

export function createPersonalSessionSyncPolicy(): PersonalSessionStatusSyncPolicy {
  return { ...DEFAULT_POLICY };
}

export function shouldContinuePolling(
  policy: PersonalSessionStatusSyncPolicy,
  input: PersonalSessionStatusSyncInput,
): PersonalSessionStatusSyncDecision {
  if (input.status === 'ACTIVE') {
    return { shouldContinue: false, nextDelayMs: 0, reason: 'active' };
  }

  if (input.status === 'STOPPED') {
    return { shouldContinue: false, nextDelayMs: 0, reason: 'stopped' };
  }

  if (input.elapsedMs >= policy.timeoutMs) {
    return { shouldContinue: false, nextDelayMs: 0, reason: 'timeout' };
  }

  if (input.consecutiveErrors >= policy.maxConsecutiveErrors) {
    return { shouldContinue: false, nextDelayMs: 0, reason: 'retry_budget_exhausted' };
  }

  const exponent = Math.max(0, input.consecutiveErrors);
  const nextDelayMs = Math.min(policy.baseIntervalMs * Math.pow(2, exponent), policy.maxIntervalMs);
  return {
    shouldContinue: true,
    nextDelayMs,
  };
}
