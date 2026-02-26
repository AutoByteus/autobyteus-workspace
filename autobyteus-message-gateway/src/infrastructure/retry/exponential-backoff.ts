export type RetryPolicy = {
  baseDelayMs: number;
  maxDelayMs: number;
  factor: number;
};

export function nextDelayMs(attempt: number, policy: RetryPolicy): number {
  if (!Number.isFinite(attempt) || attempt <= 0) {
    throw new Error("attempt must be a positive number.");
  }
  if (!Number.isFinite(policy.baseDelayMs) || policy.baseDelayMs < 0) {
    throw new Error("baseDelayMs must be a non-negative number.");
  }
  if (!Number.isFinite(policy.maxDelayMs) || policy.maxDelayMs < 0) {
    throw new Error("maxDelayMs must be a non-negative number.");
  }
  if (!Number.isFinite(policy.factor) || policy.factor < 1) {
    throw new Error("factor must be >= 1.");
  }

  const rawDelay = policy.baseDelayMs * Math.pow(policy.factor, attempt - 1);
  return Math.min(policy.maxDelayMs, Math.round(rawDelay));
}
