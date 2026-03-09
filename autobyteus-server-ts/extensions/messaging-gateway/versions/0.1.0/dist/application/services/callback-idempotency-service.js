export class CallbackIdempotencyService {
    store;
    config;
    constructor(store, config) {
        this.store = store;
        this.config = config;
    }
    async checkAndMarkCallback(key) {
        return this.store.checkAndSet(key, this.config.ttlSeconds);
    }
}
//# sourceMappingURL=callback-idempotency-service.js.map