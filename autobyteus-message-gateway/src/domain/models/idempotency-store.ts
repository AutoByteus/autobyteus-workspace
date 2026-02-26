export type IdempotencyReservation = {
  duplicate: boolean;
  expiresAt: Date;
};

export interface IdempotencyStore {
  checkAndSet(key: string, ttlSeconds: number): Promise<IdempotencyReservation>;
}
