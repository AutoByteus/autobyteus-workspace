export class PersonalPeerCandidateIndex {
    maxCandidatesPerSession;
    sessionIndex = new Map();
    constructor(maxCandidatesPerSession = 500) {
        if (!Number.isInteger(maxCandidatesPerSession) || maxCandidatesPerSession <= 0) {
            throw new Error("maxCandidatesPerSession must be a positive integer.");
        }
        this.maxCandidatesPerSession = maxCandidatesPerSession;
    }
    recordObservation(sessionId, observation) {
        const normalizedSessionId = normalizeRequiredString(sessionId, "sessionId");
        const normalizedPeerId = normalizeRequiredString(observation.peerId, "peerId");
        const threadId = normalizeOptionalString(observation.threadId);
        const displayName = normalizeOptionalString(observation.displayName);
        const lastMessageAt = normalizeIsoDate(observation.observedAt);
        const perSession = this.ensureSessionBucket(normalizedSessionId);
        const key = buildCandidateKey(normalizedPeerId, threadId);
        const existing = perSession.get(key);
        if (!existing) {
            perSession.set(key, {
                peerId: normalizedPeerId,
                peerType: observation.peerType,
                threadId,
                displayName,
                lastMessageAt,
            });
            this.trimToMax(perSession);
            return;
        }
        const nextObservedAtMs = Date.parse(lastMessageAt);
        const prevObservedAtMs = Date.parse(existing.lastMessageAt);
        if (Number.isFinite(nextObservedAtMs) && nextObservedAtMs >= prevObservedAtMs) {
            existing.lastMessageAt = lastMessageAt;
            existing.peerType = observation.peerType;
            if (displayName) {
                existing.displayName = displayName;
            }
        }
        else if (!existing.displayName && displayName) {
            existing.displayName = displayName;
        }
    }
    listCandidates(sessionId, options) {
        const normalizedSessionId = normalizeRequiredString(sessionId, "sessionId");
        const perSession = this.sessionIndex.get(normalizedSessionId);
        if (!perSession || perSession.size === 0) {
            return [];
        }
        const includeGroups = options?.includeGroups ?? true;
        const limit = toLimit(options?.limit, this.maxCandidatesPerSession);
        return [...perSession.values()]
            .filter((item) => includeGroups || item.peerType !== "GROUP")
            .sort((left, right) => Date.parse(right.lastMessageAt) - Date.parse(left.lastMessageAt))
            .slice(0, limit)
            .map((item) => ({ ...item }));
    }
    clearSession(sessionId) {
        const normalizedSessionId = normalizeRequiredString(sessionId, "sessionId");
        this.sessionIndex.delete(normalizedSessionId);
    }
    ensureSessionBucket(sessionId) {
        let bucket = this.sessionIndex.get(sessionId);
        if (!bucket) {
            bucket = new Map();
            this.sessionIndex.set(sessionId, bucket);
        }
        return bucket;
    }
    trimToMax(bucket) {
        if (bucket.size <= this.maxCandidatesPerSession) {
            return;
        }
        const sortedByOldestFirst = [...bucket.entries()].sort((left, right) => Date.parse(left[1].lastMessageAt) - Date.parse(right[1].lastMessageAt));
        while (bucket.size > this.maxCandidatesPerSession) {
            const oldest = sortedByOldestFirst.shift();
            if (!oldest) {
                break;
            }
            bucket.delete(oldest[0]);
        }
    }
}
const buildCandidateKey = (peerId, threadId) => `${peerId}::${threadId ?? ""}`;
const normalizeRequiredString = (value, field) => {
    const normalized = value.trim();
    if (normalized.length === 0) {
        throw new Error(`${field} must be a non-empty string.`);
    }
    return normalized;
};
const normalizeOptionalString = (value) => {
    if (value === null) {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
const normalizeIsoDate = (value) => {
    const normalized = normalizeRequiredString(value, "observedAt");
    const parsed = Date.parse(normalized);
    if (!Number.isFinite(parsed)) {
        throw new Error("observedAt must be an ISO date string.");
    }
    return new Date(parsed).toISOString();
};
const toLimit = (value, fallback) => {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error("limit must be a positive integer.");
    }
    return Math.min(value, fallback);
};
//# sourceMappingURL=personal-peer-candidate-index.js.map