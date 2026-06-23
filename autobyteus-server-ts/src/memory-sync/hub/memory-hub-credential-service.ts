import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeSourceNodeId } from "../shared/source-node-id.js";
import type {
  MemoryHubSourceCredentialRecord,
  MemoryHubSourceCredentialSummary,
} from "../shared/memory-sync-types.js";
import {
  getLocalFileMemoryHubCredentialStore,
  type LocalFileMemoryHubCredentialStore,
} from "./local-file-memory-hub-credential-store.js";

const TOKEN_PREFIX = "mhub_";

export class MemoryHubCredentialError extends Error {
  constructor(message: string, public readonly statusCode = 401) {
    super(message);
    this.name = "MemoryHubCredentialError";
  }
}

export const hashMemoryHubCredential = (credential: string): string =>
  createHash("sha256").update(credential, "utf8").digest("hex");

const safeEqualHex = (leftHex: string, rightHex: string): boolean => {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

const generateCredentialId = (): string => `mhubcred_${randomBytes(16).toString("hex")}`;
const generateCredential = (): string => `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

const normalizeLabel = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, 160) : null;
};

const toSummary = (record: MemoryHubSourceCredentialRecord): MemoryHubSourceCredentialSummary => ({
  credentialId: record.credentialId,
  label: record.label,
  boundSourceNodeId: record.boundSourceNodeId,
  createdAt: record.createdAt,
  lastUsedAt: record.lastUsedAt,
  revokedAt: record.revokedAt,
  status: record.revokedAt ? "revoked" : "active",
});

export class MemoryHubCredentialService {
  constructor(private readonly store: LocalFileMemoryHubCredentialStore = getLocalFileMemoryHubCredentialStore()) {}

  async listCredentialSummaries(): Promise<MemoryHubSourceCredentialSummary[]> {
    return (await this.store.listRecords()).map(toSummary);
  }

  async listActiveCredentialSummaries(): Promise<MemoryHubSourceCredentialSummary[]> {
    return (await this.listCredentialSummaries()).filter((credential) => credential.status === "active");
  }

  async createCredential(input: {
    label?: string | null;
    boundSourceNodeId?: string | null;
  } = {}): Promise<{ summary: MemoryHubSourceCredentialSummary; plaintextToken: string }> {
    const now = new Date().toISOString();
    const plaintextToken = generateCredential();
    const record: MemoryHubSourceCredentialRecord = {
      credentialId: generateCredentialId(),
      label: normalizeLabel(input.label),
      credentialHash: hashMemoryHubCredential(plaintextToken),
      boundSourceNodeId: input.boundSourceNodeId ? normalizeSourceNodeId(input.boundSourceNodeId) : null,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    };
    await this.store.updateRecords((records) => [...records, record]);
    return { summary: toSummary(record), plaintextToken };
  }

  async regenerateCredential(credentialId: string): Promise<{ summary: MemoryHubSourceCredentialSummary; plaintextToken: string }> {
    const normalizedId = credentialId.trim();
    const plaintextToken = generateCredential();
    let updated: MemoryHubSourceCredentialRecord | null = null;
    await this.store.updateRecords((records) => records.map((record) => {
      if (record.credentialId !== normalizedId) {
        return record;
      }
      updated = {
        ...record,
        credentialHash: hashMemoryHubCredential(plaintextToken),
        revokedAt: null,
      };
      return updated;
    }));
    if (!updated) {
      throw new MemoryHubCredentialError("Memory Hub credential was not found.", 404);
    }
    return { summary: toSummary(updated), plaintextToken };
  }

  async revokeCredential(credentialId: string): Promise<MemoryHubSourceCredentialSummary> {
    const normalizedId = credentialId.trim();
    const now = new Date().toISOString();
    let revoked: MemoryHubSourceCredentialRecord | null = null;
    await this.store.updateRecords((records) => records.map((record) => {
      if (record.credentialId !== normalizedId) {
        return record;
      }
      revoked = { ...record, revokedAt: record.revokedAt ?? now };
      return revoked;
    }));
    if (!revoked) {
      throw new MemoryHubCredentialError("Memory Hub credential was not found.", 404);
    }
    return toSummary(revoked);
  }

  async validateCredentialForSource(input: {
    plaintextToken: string | null | undefined;
    sourceNodeId: string;
    bindOnFirstUse?: boolean;
  }): Promise<MemoryHubSourceCredentialSummary> {
    const token = String(input.plaintextToken ?? "").trim();
    if (!token || !token.startsWith(TOKEN_PREFIX)) {
      throw new MemoryHubCredentialError("Memory Hub source token is required.");
    }
    const sourceNodeId = normalizeSourceNodeId(input.sourceNodeId);
    const hash = hashMemoryHubCredential(token);
    let matched: MemoryHubSourceCredentialRecord | null = null;
    let conflict = false;
    const now = new Date().toISOString();

    await this.store.updateRecords((records) => records.map((record) => {
      if (!safeEqualHex(record.credentialHash, hash)) {
        return record;
      }
      if (record.revokedAt) {
        matched = record;
        return record;
      }
      if (record.boundSourceNodeId && record.boundSourceNodeId !== sourceNodeId) {
        conflict = true;
        matched = record;
        return record;
      }
      const next = {
        ...record,
        boundSourceNodeId: record.boundSourceNodeId ?? (input.bindOnFirstUse === false ? null : sourceNodeId),
        lastUsedAt: now,
      };
      matched = next;
      return next;
    }));

    const validated = matched as MemoryHubSourceCredentialRecord | null;
    if (!validated) {
      throw new MemoryHubCredentialError("Memory Hub source token is invalid.");
    }
    if (validated.revokedAt) {
      throw new MemoryHubCredentialError("Memory Hub source token has been revoked.", 403);
    }
    if (conflict) {
      throw new MemoryHubCredentialError("Memory Hub source token is bound to a different source node.", 403);
    }
    return toSummary(validated);
  }
}

let singleton: MemoryHubCredentialService | null = null;

export const getMemoryHubCredentialService = (): MemoryHubCredentialService => {
  singleton ??= new MemoryHubCredentialService();
  return singleton;
};

export const resetMemoryHubCredentialServiceForTests = (): void => {
  singleton = null;
};
