export type RetryClassifier = (error: unknown, attempt: number) => boolean;
export type SleepFn = (delayMs: number) => Promise<void>;

export type RetryWithBackoffOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  retryClassifier?: RetryClassifier;
  sleep?: SleepFn;
};

const defaultRetryClassifier: RetryClassifier = () => true;

const defaultSleep: SleepFn = async (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export class CommandRetryPolicy {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly jitterRatio: number;
  private readonly retryClassifier: RetryClassifier;
  private readonly sleep: SleepFn;

  constructor(options: RetryWithBackoffOptions = {}) {
    this.maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 3));
    this.baseDelayMs = Math.max(1, Math.floor(options.baseDelayMs ?? 200));
    this.maxDelayMs = Math.max(this.baseDelayMs, Math.floor(options.maxDelayMs ?? 2000));
    this.jitterRatio = Math.min(1, Math.max(0, options.jitterRatio ?? 0.2));
    this.retryClassifier = options.retryClassifier ?? defaultRetryClassifier;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async retryWithBackoff<T>(work: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await work(attempt);
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxAttempts || !this.retryClassifier(error, attempt)) {
          throw error;
        }
        await this.sleep(this.computeDelayMs(attempt));
      }
    }

    throw lastError ?? new Error("Retry attempts exhausted.");
  }

  private computeDelayMs(attempt: number): number {
    const exponentialDelay = Math.min(
      this.maxDelayMs,
      this.baseDelayMs * Math.pow(4, Math.max(0, attempt - 1)),
    );
    if (this.jitterRatio <= 0) {
      return exponentialDelay;
    }
    const jitterRange = Math.floor(exponentialDelay * this.jitterRatio);
    const jitter = Math.floor((Math.random() * (jitterRange * 2 + 1)) - jitterRange);
    return Math.max(1, exponentialDelay + jitter);
  }
}
