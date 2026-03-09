import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { parseExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
const DEFAULT_FILENAME = "outbound-outbox.json";
export class FileOutboxStore {
    storePath;
    state = null;
    mutationQueue = Promise.resolve();
    constructor(rootDir, fileName = DEFAULT_FILENAME) {
        this.storePath = path.join(rootDir, fileName);
    }
    async upsertByDispatchKey(input) {
        return this.withMutation(async () => {
            const state = await this.loadState();
            const existing = state.records.find((record) => record.dispatchKey === input.dispatchKey);
            if (existing) {
                return {
                    record: existing,
                    duplicate: true,
                };
            }
            const nowIso = toIsoTimestamp(input.createdAt ?? new Date().toISOString(), "createdAt");
            const next = {
                id: randomUUID(),
                dispatchKey: normalizeRequiredString(input.dispatchKey, "dispatchKey"),
                provider: input.payload.provider,
                transport: input.payload.transport,
                accountId: input.payload.accountId,
                peerId: input.payload.peerId,
                threadId: input.payload.threadId,
                payload: input.payload,
                status: "PENDING",
                attemptCount: 0,
                nextAttemptAt: null,
                lastError: null,
                createdAt: nowIso,
                updatedAt: nowIso,
            };
            state.records.push(next);
            await this.persistState(state);
            return {
                record: next,
                duplicate: false,
            };
        });
    }
    async getById(recordId) {
        const state = await this.loadState();
        return state.records.find((record) => record.id === recordId) ?? null;
    }
    async leasePending(limit, nowIso) {
        const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
        if (normalizedLimit === 0) {
            return [];
        }
        const state = await this.loadState();
        const nowEpoch = toEpochMs(nowIso, "nowIso");
        const leaseStatuses = ["PENDING", "FAILED_RETRY"];
        return state.records
            .filter((record) => leaseStatuses.includes(record.status))
            .filter((record) => {
            if (!record.nextAttemptAt) {
                return true;
            }
            return toEpochMs(record.nextAttemptAt, "nextAttemptAt") <= nowEpoch;
        })
            .sort((left, right) => compareTimestamps(left.createdAt, right.createdAt))
            .slice(0, normalizedLimit);
    }
    async updateStatus(recordId, update) {
        return this.withMutation(async () => {
            const state = await this.loadState();
            const index = state.records.findIndex((record) => record.id === recordId);
            if (index < 0) {
                throw new Error(`Outbox record not found: ${recordId}`);
            }
            const current = state.records[index];
            const next = {
                ...current,
                status: update.status,
                attemptCount: update.attemptCount === undefined
                    ? current.attemptCount
                    : normalizeNonNegativeInteger(update.attemptCount, "attemptCount"),
                nextAttemptAt: update.nextAttemptAt === undefined
                    ? current.nextAttemptAt
                    : normalizeOptionalIso(update.nextAttemptAt, "nextAttemptAt"),
                lastError: update.lastError === undefined
                    ? current.lastError
                    : normalizeOptionalString(update.lastError),
                updatedAt: toIsoTimestamp(update.updatedAt ?? new Date().toISOString(), "updatedAt"),
            };
            state.records[index] = next;
            await this.persistState(state);
            return next;
        });
    }
    async listByStatus(statuses) {
        const filter = new Set(statuses);
        if (filter.size === 0) {
            return [];
        }
        const state = await this.loadState();
        return state.records.filter((record) => filter.has(record.status));
    }
    async withMutation(mutation) {
        let resolveResult = () => undefined;
        let rejectResult = () => undefined;
        const result = new Promise((resolve, reject) => {
            resolveResult = resolve;
            rejectResult = reject;
        });
        this.mutationQueue = this.mutationQueue.then(async () => {
            try {
                resolveResult(await mutation());
            }
            catch (error) {
                rejectResult(error);
            }
        });
        await this.mutationQueue;
        return result;
    }
    async loadState() {
        if (this.state) {
            return this.state;
        }
        try {
            const raw = await readFile(this.storePath, "utf8");
            this.state = parseState(JSON.parse(raw));
            return this.state;
        }
        catch (error) {
            if (!isNotFoundError(error)) {
                throw error;
            }
            this.state = {
                version: 1,
                records: [],
            };
            return this.state;
        }
    }
    async persistState(state) {
        await mkdir(path.dirname(this.storePath), { recursive: true });
        const tempPath = `${this.storePath}.tmp`;
        await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
        await rename(tempPath, this.storePath);
    }
}
const parseState = (value) => {
    if (!isRecord(value)) {
        throw new Error("Invalid outbound outbox state payload.");
    }
    if (value.version !== 1) {
        throw new Error("Unsupported outbound outbox file state version.");
    }
    if (!Array.isArray(value.records)) {
        throw new Error("Outbound outbox state records must be an array.");
    }
    return {
        version: 1,
        records: value.records.map((entry) => parseRecord(entry)),
    };
};
const parseRecord = (value) => {
    if (!isRecord(value)) {
        throw new Error("Outbound outbox record must be an object.");
    }
    const id = normalizeRequiredString(value.id, "id");
    const dispatchKey = normalizeRequiredString(value.dispatchKey, "dispatchKey");
    const provider = parseExternalChannelProvider(value.provider);
    const transport = parseExternalChannelTransport(value.transport);
    const accountId = normalizeRequiredString(value.accountId, "accountId");
    const peerId = normalizeRequiredString(value.peerId, "peerId");
    const threadId = normalizeOptionalString(value.threadId);
    const payload = parsePayload(value.payload);
    const status = parseStatus(value.status);
    const attemptCount = normalizeNonNegativeInteger(value.attemptCount, "attemptCount");
    const nextAttemptAt = normalizeOptionalIso(value.nextAttemptAt, "nextAttemptAt");
    const lastError = normalizeOptionalString(value.lastError);
    const createdAt = toIsoTimestamp(value.createdAt, "createdAt");
    const updatedAt = toIsoTimestamp(value.updatedAt, "updatedAt");
    return {
        id,
        dispatchKey,
        provider,
        transport,
        accountId,
        peerId,
        threadId,
        payload,
        status,
        attemptCount,
        nextAttemptAt,
        lastError,
        createdAt,
        updatedAt,
    };
};
const parsePayload = (value) => {
    if (!isRecord(value)) {
        throw new Error("Outbound outbox payload must be an object.");
    }
    return value;
};
const parseStatus = (value) => {
    if (value === "PENDING" ||
        value === "SENDING" ||
        value === "SENT" ||
        value === "FAILED_RETRY" ||
        value === "DEAD_LETTER") {
        return value;
    }
    throw new Error(`Unsupported outbound outbox status: ${String(value)}`);
};
const compareTimestamps = (left, right) => toEpochMs(left, "timestamp") - toEpochMs(right, "timestamp");
const toEpochMs = (value, key) => {
    const normalized = toIsoTimestamp(value, key);
    return Date.parse(normalized);
};
const toIsoTimestamp = (value, key) => {
    if (typeof value !== "string") {
        throw new Error(`${key} must be an ISO timestamp string.`);
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        throw new Error(`${key} must be a non-empty ISO timestamp string.`);
    }
    const epoch = Date.parse(trimmed);
    if (!Number.isFinite(epoch)) {
        throw new Error(`${key} must be a valid ISO timestamp.`);
    }
    return new Date(epoch).toISOString();
};
const normalizeRequiredString = (value, key) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${key} must be a non-empty string.`);
    }
    return value.trim();
};
const normalizeOptionalString = (value) => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
const normalizeOptionalIso = (value, key) => {
    if (value === undefined || value === null) {
        return null;
    }
    return toIsoTimestamp(value, key);
};
const normalizeNonNegativeInteger = (value, key) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new Error(`${key} must be a non-negative integer.`);
    }
    return value;
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isNotFoundError = (error) => typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT";
//# sourceMappingURL=file-outbox-store.js.map