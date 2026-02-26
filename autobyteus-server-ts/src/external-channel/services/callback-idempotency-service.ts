import type { ChannelIdempotencyProvider } from "../providers/channel-idempotency-provider.js";

export type CallbackIdempotencyServiceOptions = {
  defaultTtlSeconds?: number;
};

export type CallbackIdempotencyDecision = {
  duplicate: boolean;
  key: string;
  firstSeenAt: Date | null;
  expiresAt: Date | null;
};

export class CallbackIdempotencyService {
  private readonly defaultTtlSeconds: number;

  private readonly provider: ChannelIdempotencyProvider;

  constructor(
    provider: ChannelIdempotencyProvider,
    options: CallbackIdempotencyServiceOptions = {},
  ) {
    this.provider = provider;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 3600;
  }

  async reserveCallbackKey(
    key: string,
    ttlSeconds = this.defaultTtlSeconds,
  ): Promise<CallbackIdempotencyDecision> {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      throw new Error("Callback idempotency key must be a non-empty string.");
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
