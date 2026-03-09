export class TelegramPeerCandidateIndex {
    byAccount = new Map();
    maxCandidatesPerAccount;
    candidateTtlMs;
    lastUpdatedAt = new Date(0).toISOString();
    constructor(config) {
        this.maxCandidatesPerAccount = normalizePositiveInteger(config.maxCandidatesPerAccount, "maxCandidatesPerAccount");
        this.candidateTtlMs =
            normalizePositiveInteger(config.candidateTtlSeconds, "candidateTtlSeconds") * 1000;
    }
    recordObservation(observation) {
        const accountId = normalizeRequiredString(observation.accountId, "accountId");
        const observedAtMs = parseObservedAt(observation.lastMessageAt);
        const now = Date.now();
        this.pruneExpired(now);
        const byKey = this.byAccount.get(accountId) ?? new Map();
        const key = buildCandidateKey(observation.peerId, observation.threadId);
        byKey.set(key, {
            ...observation,
            accountId,
            observedAtMs,
            lastMessageAt: new Date(observedAtMs).toISOString(),
        });
        enforceMax(byKey, this.maxCandidatesPerAccount);
        this.byAccount.set(accountId, byKey);
        this.lastUpdatedAt = new Date(now).toISOString();
    }
    listCandidates(options) {
        const accountId = normalizeRequiredString(options.accountId, "accountId");
        const includeGroups = options.includeGroups ?? true;
        const limit = normalizeLimit(options.limit, this.maxCandidatesPerAccount);
        const now = Date.now();
        this.pruneExpired(now);
        const byKey = this.byAccount.get(accountId);
        if (!byKey || byKey.size === 0) {
            return {
                accountId,
                updatedAt: this.lastUpdatedAt,
                items: [],
            };
        }
        const items = [...byKey.values()]
            .filter((candidate) => includeGroups || candidate.peerType !== "GROUP")
            .sort((left, right) => right.observedAtMs - left.observedAtMs)
            .slice(0, limit)
            .map((candidate) => ({
            peerId: candidate.peerId,
            peerType: candidate.peerType,
            threadId: candidate.threadId,
            displayName: candidate.displayName,
            lastMessageAt: candidate.lastMessageAt,
        }));
        return {
            accountId,
            updatedAt: this.lastUpdatedAt,
            items,
        };
    }
    pruneExpired(nowMs = Date.now()) {
        const minObservedAt = nowMs - this.candidateTtlMs;
        for (const [accountId, byKey] of this.byAccount.entries()) {
            for (const [key, candidate] of byKey.entries()) {
                if (candidate.observedAtMs < minObservedAt) {
                    byKey.delete(key);
                }
            }
            if (byKey.size === 0) {
                this.byAccount.delete(accountId);
            }
        }
    }
}
const enforceMax = (byKey, maxCandidatesPerAccount) => {
    if (byKey.size <= maxCandidatesPerAccount) {
        return;
    }
    const ranked = [...byKey.entries()].sort((left, right) => right[1].observedAtMs - left[1].observedAtMs);
    byKey.clear();
    for (const [key, candidate] of ranked.slice(0, maxCandidatesPerAccount)) {
        byKey.set(key, candidate);
    }
};
const buildCandidateKey = (peerId, threadId) => `${peerId}::${threadId ?? ""}`;
const normalizeRequiredString = (value, field) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${field} must be a non-empty string.`);
    }
    return value.trim();
};
const parseObservedAt = (value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error("lastMessageAt must be an ISO timestamp string.");
    }
    const parsed = new Date(value);
    const timestamp = parsed.getTime();
    if (Number.isNaN(timestamp)) {
        throw new Error("lastMessageAt must be an ISO timestamp string.");
    }
    return timestamp;
};
const normalizePositiveInteger = (value, field) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new Error(`${field} must be a positive integer.`);
    }
    return value;
};
const normalizeLimit = (value, fallback) => {
    if (value === undefined || value === null) {
        return fallback;
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new Error("limit must be a positive integer.");
    }
    return Math.min(value, fallback);
};
//# sourceMappingURL=telegram-peer-candidate-index.js.map