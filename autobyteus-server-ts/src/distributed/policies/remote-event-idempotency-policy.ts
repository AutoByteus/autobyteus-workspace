export type RemoteEventIdempotencyInput = {
  teamRunId: string;
  sourceNodeId: string;
  sourceEventId: string;
};

type RemoteEventIdempotencyPolicyOptions = {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
};

type CacheEntry = {
  key: string;
  expiresAtMs: number;
};

const normalizeRequired = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export class RemoteEventIdempotencyPolicy {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly expiresAtByKey = new Map<string, number>();

  constructor(options: RemoteEventIdempotencyPolicyOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60_000;
    this.maxEntries = options.maxEntries ?? 20_000;
    this.now = options.now ?? Date.now;
  }

  shouldDropDuplicate(input: RemoteEventIdempotencyInput): boolean {
    const key = this.buildKey(input);
    const nowMs = this.now();
    this.pruneExpired(nowMs);

    const existingExpiry = this.expiresAtByKey.get(key);
    if (existingExpiry !== undefined && existingExpiry > nowMs) {
      return true;
    }

    this.ensureCapacity();
    this.expiresAtByKey.set(key, nowMs + this.ttlMs);
    return false;
  }

  private ensureCapacity(): void {
    while (this.expiresAtByKey.size >= this.maxEntries) {
      const oldest = this.expiresAtByKey.keys().next().value;
      if (!oldest) {
        return;
      }
      this.expiresAtByKey.delete(oldest);
    }
  }

  private pruneExpired(nowMs: number): void {
    const removals: CacheEntry[] = [];
    for (const [key, expiresAtMs] of this.expiresAtByKey.entries()) {
      if (expiresAtMs <= nowMs) {
        removals.push({ key, expiresAtMs });
      }
    }
    for (const entry of removals) {
      this.expiresAtByKey.delete(entry.key);
    }
  }

  private buildKey(input: RemoteEventIdempotencyInput): string {
    const teamRunId = normalizeRequired(input.teamRunId, "teamRunId");
    const sourceNodeId = normalizeRequired(input.sourceNodeId, "sourceNodeId");
    const sourceEventId = normalizeRequired(input.sourceEventId, "sourceEventId");
    return `${teamRunId}::${sourceNodeId}::${sourceEventId}`;
  }
}
