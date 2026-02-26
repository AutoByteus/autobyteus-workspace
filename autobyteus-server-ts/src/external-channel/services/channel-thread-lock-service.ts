export type ChannelThreadKey = string;

export class ChannelThreadLockTimeoutError extends Error {
  readonly threadKey: ChannelThreadKey;
  readonly timeoutMs: number;

  constructor(threadKey: ChannelThreadKey, timeoutMs: number) {
    super(`Timed out while waiting for channel thread lock key='${threadKey}' in ${timeoutMs}ms.`);
    this.name = "ChannelThreadLockTimeoutError";
    this.threadKey = threadKey;
    this.timeoutMs = timeoutMs;
  }
}

export class ChannelThreadLockService {
  private readonly queueTails = new Map<ChannelThreadKey, Promise<void>>();
  private readonly defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 30000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  async withThreadLock<T>(
    key: ChannelThreadKey,
    work: () => Promise<T>,
    timeoutMs = this.defaultTimeoutMs,
  ): Promise<T> {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      throw new Error("Thread lock key must be a non-empty string.");
    }

    const previousTail = this.queueTails.get(normalizedKey) ?? Promise.resolve();
    let releaseCurrentTail: () => void = () => undefined;
    const currentTail = previousTail
      .catch(() => undefined)
      .then(
        () =>
          new Promise<void>((resolve) => {
            releaseCurrentTail = resolve;
          }),
      );

    this.queueTails.set(normalizedKey, currentTail);

    try {
      await this.awaitWithTimeout(previousTail, timeoutMs, normalizedKey);
      return await work();
    } finally {
      releaseCurrentTail();
      if (this.queueTails.get(normalizedKey) === currentTail) {
        this.queueTails.delete(normalizedKey);
      }
    }
  }

  private async awaitWithTimeout(
    promise: Promise<unknown>,
    timeoutMs: number,
    key: ChannelThreadKey,
  ): Promise<void> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error(`Thread lock timeout must be > 0. Received: ${timeoutMs}`);
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new ChannelThreadLockTimeoutError(key, timeoutMs));
      }, timeoutMs);
    });

    await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
