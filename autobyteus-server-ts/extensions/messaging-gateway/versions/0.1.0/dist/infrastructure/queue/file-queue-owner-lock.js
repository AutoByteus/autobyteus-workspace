import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export class QueueOwnerLockLostError extends Error {
    constructor(message) {
        super(message);
        this.name = "QueueOwnerLockLostError";
    }
}
const DEFAULT_LEASE_MS = 15_000;
const CLAIM_LEASE_MS = 5_000;
export class FileQueueOwnerLock {
    lockPath;
    claimPath;
    ownerId;
    leaseMs;
    nowEpochMs;
    acquired = false;
    constructor(config) {
        this.lockPath = path.join(config.rootDir, `${normalizeNamespace(config.namespace)}.lock.json`);
        this.claimPath = `${this.lockPath}.claim.json`;
        this.ownerId = normalizeOwnerId(config.ownerId ?? randomUUID());
        this.leaseMs = normalizeLeaseMs(config.leaseMs ?? DEFAULT_LEASE_MS);
        this.nowEpochMs = config.nowEpochMs ?? (() => Date.now());
    }
    async acquire() {
        await this.acquireClaim();
        try {
            const lock = await this.readLock();
            const now = this.nowEpochMs();
            if (lock && lock.ownerId !== this.ownerId && lock.expiresAtEpochMs > now) {
                throw new Error(`Queue lock is owned by another process (${lock.ownerId}) for ${path.basename(this.lockPath)}.`);
            }
            const next = this.buildState(now, lock?.acquiredAtIso ?? toIso(now));
            await this.writeLock(next);
            this.acquired = true;
        }
        finally {
            await this.releaseClaim();
        }
    }
    async heartbeat() {
        if (!this.acquired) {
            throw new QueueOwnerLockLostError(`Queue lock heartbeat rejected: lock for ${path.basename(this.lockPath)} was not acquired.`);
        }
        const existing = await this.readLock();
        if (!existing || existing.ownerId !== this.ownerId) {
            this.acquired = false;
            throw new QueueOwnerLockLostError(`Queue lock ownership lost for ${path.basename(this.lockPath)}.`);
        }
        const now = this.nowEpochMs();
        const next = this.buildState(now, existing.acquiredAtIso);
        await this.writeLock(next);
    }
    async release() {
        const existing = await this.readLock();
        this.acquired = false;
        if (!existing || existing.ownerId !== this.ownerId) {
            return;
        }
        await rm(this.lockPath, { force: true });
    }
    getOwnerId() {
        return this.ownerId;
    }
    buildState(nowEpochMs, acquiredAtIso) {
        return {
            version: 1,
            ownerId: this.ownerId,
            expiresAtEpochMs: nowEpochMs + this.leaseMs,
            acquiredAtIso,
            updatedAtIso: toIso(nowEpochMs),
        };
    }
    async readLock() {
        try {
            const raw = await readFile(this.lockPath, "utf8");
            return parseLock(JSON.parse(raw));
        }
        catch (error) {
            if (isNotFoundError(error)) {
                return null;
            }
            throw error;
        }
    }
    async writeLock(next) {
        await mkdir(path.dirname(this.lockPath), { recursive: true });
        const tempPath = `${this.lockPath}.tmp`;
        await writeFile(tempPath, JSON.stringify(next, null, 2), "utf8");
        await rename(tempPath, this.lockPath);
    }
    async acquireClaim() {
        await mkdir(path.dirname(this.claimPath), { recursive: true });
        const claimPayload = () => ({
            version: 1,
            ownerId: this.ownerId,
            expiresAtEpochMs: this.nowEpochMs() + CLAIM_LEASE_MS,
        });
        try {
            await writeFile(this.claimPath, JSON.stringify(claimPayload(), null, 2), {
                encoding: "utf8",
                flag: "wx",
            });
            return;
        }
        catch (error) {
            if (!isAlreadyExistsError(error)) {
                throw error;
            }
        }
        const existingClaim = await this.readClaim();
        const now = this.nowEpochMs();
        if (existingClaim && existingClaim.expiresAtEpochMs > now) {
            throw new Error(`Queue lock acquire is busy for ${path.basename(this.lockPath)}. Retry startup shortly.`);
        }
        // Stale claim file: reclaim and take claim once.
        await rm(this.claimPath, { force: true });
        await writeFile(this.claimPath, JSON.stringify(claimPayload(), null, 2), {
            encoding: "utf8",
            flag: "wx",
        });
    }
    async releaseClaim() {
        const existingClaim = await this.readClaim();
        if (!existingClaim || existingClaim.ownerId !== this.ownerId) {
            return;
        }
        await rm(this.claimPath, { force: true });
    }
    async readClaim() {
        try {
            const raw = await readFile(this.claimPath, "utf8");
            return parseClaim(JSON.parse(raw));
        }
        catch (error) {
            if (isNotFoundError(error)) {
                return null;
            }
            throw error;
        }
    }
}
const parseLock = (value) => {
    if (!isRecord(value)) {
        throw new Error("Invalid queue owner lock payload.");
    }
    if (value.version !== 1) {
        throw new Error("Unsupported queue owner lock version.");
    }
    const ownerId = normalizeOwnerId(value.ownerId);
    const expiresAtEpochMs = normalizeEpoch(value.expiresAtEpochMs, "expiresAtEpochMs");
    const acquiredAtIso = normalizeIso(value.acquiredAtIso, "acquiredAtIso");
    const updatedAtIso = normalizeIso(value.updatedAtIso, "updatedAtIso");
    return {
        version: 1,
        ownerId,
        expiresAtEpochMs,
        acquiredAtIso,
        updatedAtIso,
    };
};
const parseClaim = (value) => {
    if (!isRecord(value)) {
        throw new Error("Invalid queue owner claim payload.");
    }
    if (value.version !== 1) {
        throw new Error("Unsupported queue owner claim version.");
    }
    return {
        version: 1,
        ownerId: normalizeOwnerId(value.ownerId),
        expiresAtEpochMs: normalizeEpoch(value.expiresAtEpochMs, "expiresAtEpochMs"),
    };
};
const normalizeNamespace = (value) => {
    const normalized = value.trim();
    if (normalized.length === 0) {
        throw new Error("Queue lock namespace must be a non-empty string.");
    }
    return normalized.replace(/[^a-zA-Z0-9_-]/g, "_");
};
const normalizeOwnerId = (value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error("Queue owner lock ownerId must be a non-empty string.");
    }
    return value.trim();
};
const normalizeLeaseMs = (value) => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error("Queue owner lock leaseMs must be a positive integer.");
    }
    return value;
};
const normalizeEpoch = (value, key) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error(`${key} must be a positive number.`);
    }
    return value;
};
const normalizeIso = (value, key) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${key} must be a non-empty string.`);
    }
    const epoch = Date.parse(value);
    if (!Number.isFinite(epoch)) {
        throw new Error(`${key} must be a valid ISO timestamp.`);
    }
    return new Date(epoch).toISOString();
};
const toIso = (epochMs) => new Date(epochMs).toISOString();
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isNotFoundError = (error) => typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT";
const isAlreadyExistsError = (error) => typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EEXIST";
//# sourceMappingURL=file-queue-owner-lock.js.map