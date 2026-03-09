import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
export class SessionCredentialStore {
    rootDir;
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    async getSessionAuthPath(sessionId) {
        const authPath = path.join(this.getSessionDir(sessionId), "auth");
        await mkdir(authPath, { recursive: true });
        return authPath;
    }
    async markSessionMeta(meta) {
        const sessionDir = this.getSessionDir(meta.sessionId);
        await mkdir(sessionDir, { recursive: true });
        await writeFile(this.getMetaPath(meta.sessionId), JSON.stringify(meta, null, 2), "utf8");
    }
    async loadSessionMeta(sessionId) {
        try {
            const raw = await readFile(this.getMetaPath(sessionId), "utf8");
            return parseMeta(JSON.parse(raw));
        }
        catch (error) {
            if (isNotFoundError(error)) {
                return null;
            }
            throw error;
        }
    }
    async listSessionMeta() {
        const sessionsRoot = this.getSessionsRootDir();
        try {
            const entries = await readdir(sessionsRoot, { withFileTypes: true });
            const metas = await Promise.all(entries
                .filter((entry) => entry.isDirectory())
                .map((entry) => this.loadSessionMeta(entry.name)));
            return metas.filter((meta) => meta !== null);
        }
        catch (error) {
            if (isNotFoundError(error)) {
                return [];
            }
            throw error;
        }
    }
    async deleteSession(sessionId) {
        await rm(this.getSessionDir(sessionId), { recursive: true, force: true });
    }
    getSessionsRootDir() {
        return path.join(this.rootDir, "sessions");
    }
    getSessionDir(sessionId) {
        return path.join(this.getSessionsRootDir(), sessionId);
    }
    getMetaPath(sessionId) {
        return path.join(this.getSessionDir(sessionId), "meta.json");
    }
}
const parseMeta = (value) => {
    if (!isRecord(value)) {
        throw new Error("Invalid session meta payload.");
    }
    const sessionId = asNonEmptyString(value.sessionId, "sessionId");
    const accountLabel = asNonEmptyString(value.accountLabel, "accountLabel");
    const status = asSessionState(value.status);
    const createdAt = asIsoString(value.createdAt, "createdAt");
    const updatedAt = asIsoString(value.updatedAt, "updatedAt");
    return {
        sessionId,
        accountLabel,
        status,
        createdAt,
        updatedAt,
    };
};
const asSessionState = (value) => {
    if (value === "PENDING_QR" ||
        value === "ACTIVE" ||
        value === "DEGRADED" ||
        value === "STOPPED") {
        return value;
    }
    throw new Error("Invalid session state.");
};
const asIsoString = (value, key) => {
    const normalized = asNonEmptyString(value, key);
    const epoch = Date.parse(normalized);
    if (!Number.isFinite(epoch)) {
        throw new Error(`${key} must be an ISO timestamp.`);
    }
    return new Date(epoch).toISOString();
};
const asNonEmptyString = (value, key) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${key} must be a non-empty string.`);
    }
    return value.trim();
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isNotFoundError = (error) => typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT";
//# sourceMappingURL=session-credential-store.js.map