import type {
  IdempotencyReservation,
  IdempotencyStore,
} from "../../domain/models/idempotency-store.js";

export type CallbackIdempotencyServiceConfig = {
  ttlSeconds: number;
};

export class CallbackIdempotencyService {
  private readonly store: IdempotencyStore;
  private readonly config: CallbackIdempotencyServiceConfig;

  constructor(store: IdempotencyStore, config: CallbackIdempotencyServiceConfig) {
    this.store = store;
    this.config = config;
  }

  async checkAndMarkCallback(key: string): Promise<IdempotencyReservation> {
    return this.store.checkAndSet(key, this.config.ttlSeconds);
  }
}
