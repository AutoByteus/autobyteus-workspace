export type ChannelIdempotencyDecision = {
  duplicate: boolean;
  key: string;
  firstSeenAt: Date | null;
  expiresAt: Date | null;
};
