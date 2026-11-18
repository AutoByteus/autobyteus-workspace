import { EventEmitter } from "node:events";
import {
  generateCredential,
  generateRecordId,
  hashSecret,
  hashesEqual,
} from "../../node-access/domain/credential-secret.js";
import type {
  BearerCredentialVerifier,
  ClientRevocationListener,
  ClientRevocationSource,
  CredentialVerification,
} from "../../node-access/domain/credential-verification.js";
import { heldBackRefusal, NODE_ACCESS_REFUSALS } from "../../node-access/domain/node-access-refusal.js";
import { MEMORY_SYNC_NOT_MIGRATED_TEXT, MemorySyncNotMigratedError } from "../shared/memory-sync-capability.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
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

const normalizeLabel = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, 160) : null;
};

const toSummary = (record: MemoryHubSourceCredentialRecord): MemoryHubSourceCredentialSummary => ({
  credentialId: record.credentialId,
  label: record.label,
  boundMemorySyncSourceId: record.boundMemorySyncSourceId,
  createdAt: record.createdAt,
  lastUsedAt: record.lastUsedAt,
  revokedAt: record.revokedAt,
  status: record.revokedAt ? "revoked" : "active",
});

/**
 * Memory Hub source credentials (`mhub_`): created, regenerated and revoked by the hub's owner. For the node's request
 * gate it is the memory sync source credential kind: records are read once and kept in memory, and a revocation or
 * regeneration closes that source's open sockets (NA-11). A source's batches bind the credential to its source ID.
 */
export class MemoryHubCredentialService implements BearerCredentialVerifier, ClientRevocationSource {
  readonly prefix = TOKEN_PREFIX;
  private records: MemoryHubSourceCredentialRecord[] | null = null;
  private readonly events = new EventEmitter();

  constructor(private readonly store: LocalFileMemoryHubCredentialStore = getLocalFileMemoryHubCredentialStore()) {}

  async listCredentialSummaries(): Promise<MemoryHubSourceCredentialSummary[]> {
    return (await this.loadedRecords()).map(toSummary);
  }

  async listActiveCredentialSummaries(): Promise<MemoryHubSourceCredentialSummary[]> {
    return (await this.listCredentialSummaries()).filter((credential) => credential.status === "active");
  }

  async createCredential(input: {
    label?: string | null;
    boundMemorySyncSourceId?: string | null;
  } = {}): Promise<{ summary: MemoryHubSourceCredentialSummary; plaintextToken: string }> {
    const now = new Date().toISOString();
    const plaintextToken = generateCredential(TOKEN_PREFIX);
    const record: MemoryHubSourceCredentialRecord = {
      credentialId: generateRecordId("mhubcred"),
      label: normalizeLabel(input.label),
      credentialHash: hashSecret(plaintextToken),
      boundMemorySyncSourceId: input.boundMemorySyncSourceId ? normalizeMemorySyncSourceId(input.boundMemorySyncSourceId) : null,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    };
    await this.update((records) => [...records, record]);
    return { summary: toSummary(record), plaintextToken };
  }

  async regenerateCredential(credentialId: string): Promise<{ summary: MemoryHubSourceCredentialSummary; plaintextToken: string }> {
    const normalizedId = credentialId.trim();
    const plaintextToken = generateCredential(TOKEN_PREFIX);
    let updated: MemoryHubSourceCredentialRecord | null = null;
    await this.update((records) => records.map((record) => {
      if (record.credentialId !== normalizedId) {
        return record;
      }
      updated = {
        ...record,
        credentialHash: hashSecret(plaintextToken),
        revokedAt: null,
      };
      return updated;
    }));
    if (!updated) {
      throw new MemoryHubCredentialError("Memory Hub credential was not found.", 404);
    }
    // The old token stops working: sockets opened with it close.
    this.publishRevoked(normalizedId);
    return { summary: toSummary(updated), plaintextToken };
  }

  async revokeCredential(credentialId: string): Promise<MemoryHubSourceCredentialSummary> {
    const normalizedId = credentialId.trim();
    const now = new Date().toISOString();
    let revoked: MemoryHubSourceCredentialRecord | null = null;
    await this.update((records) => records.map((record) => {
      if (record.credentialId !== normalizedId) {
        return record;
      }
      revoked = { ...record, revokedAt: record.revokedAt ?? now };
      return revoked;
    }));
    if (!revoked) {
      throw new MemoryHubCredentialError("Memory Hub credential was not found.", 404);
    }
    this.publishRevoked(normalizedId);
    return toSummary(revoked);
  }

  /** The gate's check of a source's credential: an existing, unrevoked `mhub_` credential, from memory. */
  async verify(credential: string): Promise<CredentialVerification> {
    const hash = hashSecret(credential);
    let records: MemoryHubSourceCredentialRecord[];
    try {
      records = await this.loadedRecords();
    } catch (error) {
      // The credentials wait for their data migration: the source is told so (autobyteus-290), as ingestion did.
      if (error instanceof MemorySyncNotMigratedError) {
        return { ok: false, refusal: heldBackRefusal("MEMORY_SYNC_NOT_MIGRATED", MEMORY_SYNC_NOT_MIGRATED_TEXT) };
      }
      throw error;
    }
    const record = records.find((candidate) => hashesEqual(candidate.credentialHash, hash));
    if (!record) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialInvalid };
    }
    if (record.revokedAt) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialRevoked };
    }
    return { ok: true, identity: { kind: "memory_sync_source", credentialId: record.credentialId } };
  }

  /**
   * A verified source credential used for a source: binds it to that source ID on its first batch and refuses it for
   * any other source ID afterwards.
   */
  async bindCredentialToSource(input: {
    credentialId: string;
    memorySyncSourceId: string;
    bindOnFirstUse: boolean;
  }): Promise<MemoryHubSourceCredentialSummary> {
    const memorySyncSourceId = normalizeMemorySyncSourceId(input.memorySyncSourceId);
    let matched: MemoryHubSourceCredentialRecord | null = null;
    let conflict = false;
    const now = new Date().toISOString();

    await this.update((records) => records.map((record) => {
      if (record.credentialId !== input.credentialId || record.revokedAt) {
        return record;
      }
      if (record.boundMemorySyncSourceId && record.boundMemorySyncSourceId !== memorySyncSourceId) {
        conflict = true;
        matched = record;
        return record;
      }
      const next = {
        ...record,
        boundMemorySyncSourceId: record.boundMemorySyncSourceId ?? (input.bindOnFirstUse ? memorySyncSourceId : null),
        lastUsedAt: now,
      };
      matched = next;
      return next;
    }));

    const validated = matched as MemoryHubSourceCredentialRecord | null;
    if (!validated) {
      throw new MemoryHubCredentialError("Memory Hub source token is invalid.");
    }
    if (conflict) {
      throw new MemoryHubCredentialError("Memory Hub source token is bound to a different Memory Sync source ID.", 403);
    }
    return toSummary(validated);
  }

  onClientRevoked(listener: ClientRevocationListener): () => void {
    this.events.on("revoked", listener);
    return () => this.events.off("revoked", listener);
  }

  private publishRevoked(credentialId: string): void {
    this.events.emit("revoked", { kind: "memory_sync_source", id: credentialId, refusal: NODE_ACCESS_REFUSALS.credentialRevoked });
  }

  private async loadedRecords(): Promise<MemoryHubSourceCredentialRecord[]> {
    this.records ??= await this.store.listRecords();
    return this.records;
  }

  private async update(
    change: (records: MemoryHubSourceCredentialRecord[]) => MemoryHubSourceCredentialRecord[],
  ): Promise<void> {
    this.records = await this.store.updateRecords(change);
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
