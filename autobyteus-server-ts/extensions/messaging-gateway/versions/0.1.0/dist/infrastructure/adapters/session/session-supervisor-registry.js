export class SessionSupervisorRegistry {
    supervisors = new Map();
    register(providerKey, supervisor) {
        const key = normalizeProviderKey(providerKey);
        if (this.supervisors.has(key)) {
            throw new Error(`Session supervisor is already registered for provider '${key}'.`);
        }
        this.supervisors.set(key, supervisor);
    }
    async startAll() {
        for (const supervisor of this.supervisors.values()) {
            await supervisor.start();
        }
    }
    async stopAll() {
        for (const supervisor of this.supervisors.values()) {
            await supervisor.stop();
        }
    }
    markDisconnected(providerKey, reason) {
        const key = normalizeProviderKey(providerKey);
        const supervisor = this.supervisors.get(key);
        if (!supervisor) {
            return;
        }
        supervisor.markDisconnected(reason);
    }
    getStatusByProvider() {
        const result = {};
        for (const [provider, supervisor] of this.supervisors.entries()) {
            result[provider] = supervisor.getStatus();
        }
        return result;
    }
}
const normalizeProviderKey = (value) => {
    const normalized = value.trim().toUpperCase();
    if (normalized.length === 0) {
        throw new Error("providerKey must be a non-empty string.");
    }
    return normalized;
};
//# sourceMappingURL=session-supervisor-registry.js.map