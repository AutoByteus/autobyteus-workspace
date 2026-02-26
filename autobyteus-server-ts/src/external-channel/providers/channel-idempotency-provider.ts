export type ChannelIdempotencyRecord = {
  key: string;
  firstSeenAt: Date;
  expiresAt: Date | null;
};

export type ChannelIdempotencyReservationResult = {
  firstSeen: boolean;
  record: ChannelIdempotencyRecord | null;
};

export interface ChannelIdempotencyProvider {
  reserveKey(key: string, ttlSeconds: number): Promise<ChannelIdempotencyReservationResult>;
}

