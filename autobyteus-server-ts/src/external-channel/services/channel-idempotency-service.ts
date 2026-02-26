import type { ChannelIdempotencyDecision } from "../domain/models.js";
import type { ChannelIdempotencyProvider } from "../providers/channel-idempotency-provider.js";

export type ChannelIdempotencyServiceOptions = {
  defaultTtlSeconds?: number;
};

export class ChannelIdempotencyService {
  private readonly defaultTtlSeconds: number;

  constructor(
    private readonly provider: ChannelIdempotencyProvider,
    options: ChannelIdempotencyServiceOptions = {},
  ) {
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 3600;
  }

  async ensureFirstSeen(
    key: string,
    ttlSeconds = this.defaultTtlSeconds,
  ): Promise<ChannelIdempotencyDecision> {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      throw new Error("Idempotency key must be a non-empty string.");
    }

    const reservation = await this.provider.reserveKey(normalizedKey, ttlSeconds);

    return {
      duplicate: !reservation.firstSeen,
      key: normalizedKey,
      firstSeenAt: reservation.record?.firstSeenAt ?? null,
      expiresAt: reservation.record?.expiresAt ?? null,
    };
  }
}

