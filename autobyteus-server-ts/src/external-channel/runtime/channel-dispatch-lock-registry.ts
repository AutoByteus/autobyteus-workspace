export class ChannelDispatchLockRegistry {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(
    key: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const normalizedKey = normalizeRequiredKey(key);
    const previous = this.tails.get(normalizedKey) ?? null;
    let releaseCurrent: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const tail = (previous ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => current);
    this.tails.set(normalizedKey, tail);

    if (previous) {
      await previous.catch(() => undefined);
    }
    try {
      return await work();
    } finally {
      releaseCurrent();
      if (this.tails.get(normalizedKey) === tail) {
        this.tails.delete(normalizedKey);
      }
    }
  }
}

let cachedRegistry: ChannelDispatchLockRegistry | null = null;

export const getChannelDispatchLockRegistry = (): ChannelDispatchLockRegistry => {
  if (!cachedRegistry) {
    cachedRegistry = new ChannelDispatchLockRegistry();
  }
  return cachedRegistry;
};

const normalizeRequiredKey = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error("Dispatch lock key must be a non-empty string.");
  }
  return normalized;
};
