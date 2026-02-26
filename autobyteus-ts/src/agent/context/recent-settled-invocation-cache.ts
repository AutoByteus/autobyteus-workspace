export class RecentSettledInvocationCache {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private entriesById: Map<string, number>;

  constructor(maxEntries: number = 1024, ttlMs: number = 5 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.entriesById = new Map();
  }

  has(invocationId: string, now: number = Date.now()): boolean {
    this.pruneExpired(now);
    const timestamp = this.entriesById.get(invocationId);
    if (timestamp === undefined) {
      return false;
    }

    // refresh recency on read
    this.entriesById.delete(invocationId);
    this.entriesById.set(invocationId, timestamp);
    return true;
  }

  add(invocationId: string, now: number = Date.now()): void {
    this.pruneExpired(now);
    if (this.entriesById.has(invocationId)) {
      this.entriesById.delete(invocationId);
    }
    this.entriesById.set(invocationId, now);
    this.enforceCapacity();
  }

  addMany(invocationIds: Iterable<string>, now: number = Date.now()): void {
    this.pruneExpired(now);
    for (const invocationId of invocationIds) {
      if (!invocationId) {
        continue;
      }
      if (this.entriesById.has(invocationId)) {
        this.entriesById.delete(invocationId);
      }
      this.entriesById.set(invocationId, now);
    }
    this.enforceCapacity();
  }

  private enforceCapacity(): void {
    while (this.entriesById.size > this.maxEntries) {
      const oldestKey = this.entriesById.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.entriesById.delete(oldestKey);
    }
  }

  private pruneExpired(now: number): void {
    if (this.entriesById.size === 0) {
      return;
    }
    for (const [invocationId, timestamp] of this.entriesById) {
      if (now - timestamp > this.ttlMs) {
        this.entriesById.delete(invocationId);
      }
    }
  }
}
