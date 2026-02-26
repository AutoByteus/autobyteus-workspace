import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionState } from "../../../domain/models/session-provider-adapter.js";

export type WechatSessionMeta = {
  sessionId: string;
  accountLabel: string;
  status: SessionState;
  createdAt: string;
  updatedAt: string;
};

export class WechatSessionStateStore {
  constructor(private readonly rootDir: string) {}

  async save(meta: WechatSessionMeta): Promise<void> {
    const sessionDir = this.getSessionDir(meta.sessionId);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(this.getMetaPath(meta.sessionId), JSON.stringify(meta, null, 2), "utf8");
  }

  async load(sessionId: string): Promise<WechatSessionMeta | null> {
    try {
      const raw = await readFile(this.getMetaPath(sessionId), "utf8");
      return parseMeta(JSON.parse(raw));
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async list(): Promise<WechatSessionMeta[]> {
    const sessionsRoot = this.getSessionsRootDir();
    try {
      const entries = await readdir(sessionsRoot, { withFileTypes: true });
      const metas = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => this.load(entry.name)),
      );
      return metas.filter((entry): entry is WechatSessionMeta => entry !== null);
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    await rm(this.getSessionDir(sessionId), { recursive: true, force: true });
  }

  private getSessionsRootDir(): string {
    return path.join(this.rootDir, "sessions");
  }

  private getSessionDir(sessionId: string): string {
    return path.join(this.getSessionsRootDir(), sessionId);
  }

  private getMetaPath(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), "meta.json");
  }
}

const parseMeta = (value: unknown): WechatSessionMeta => {
  if (!isRecord(value)) {
    throw new Error("Invalid WeChat session metadata payload.");
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

const asSessionState = (value: unknown): SessionState => {
  if (
    value === "PENDING_QR" ||
    value === "ACTIVE" ||
    value === "DEGRADED" ||
    value === "STOPPED"
  ) {
    return value;
  }
  throw new Error("Invalid WeChat session state.");
};

const asIsoString = (value: unknown, key: string): string => {
  const normalized = asNonEmptyString(value, key);
  const epoch = Date.parse(normalized);
  if (!Number.isFinite(epoch)) {
    throw new Error(`${key} must be an ISO timestamp.`);
  }
  return new Date(epoch).toISOString();
};

const asNonEmptyString = (value: unknown, key: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value.trim();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "ENOENT";
