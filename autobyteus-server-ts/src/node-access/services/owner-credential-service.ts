import { EventEmitter } from "node:events";
import type { ClientIdentity } from "../domain/client-identity.js";
import {
  generateCredential,
  generateRecordId,
  hashSecret,
  hashesEqual,
} from "../domain/credential-secret.js";
import type {
  BearerCredentialVerifier,
  ClientRevocation,
  ClientRevocationListener,
  ClientRevocationSource,
  CredentialVerification,
} from "../domain/credential-verification.js";
import { NODE_ACCESS_REFUSALS } from "../domain/node-access-refusal.js";
import type { OwnerCredentialRecord, OwnerCredentialStore } from "../stores/owner-credential-store.js";

export const OWNER_CREDENTIAL_PREFIX = "own_";
/** The credential ID of the launch credential: the desktop that started this node process. */
export const LAUNCH_CREDENTIAL_ID = "launch";

const LAST_SEEN_INTERVAL_MS = 60_000;
const MAX_DESKTOP_NAME_LENGTH = 120;

export type OwnerCredentialSummary = Readonly<{
  credentialId: string;
  desktopName: string;
  createdAt: string;
  lastSeenAt: string | null;
}>;

export type IssuedOwnerCredential = Readonly<{ credentialId: string; credential: string }>;

const toSummary = (record: OwnerCredentialRecord): OwnerCredentialSummary => Object.freeze({
  credentialId: record.credentialId,
  desktopName: record.desktopName,
  createdAt: record.createdAt,
  lastSeenAt: record.lastSeenAt,
});

const normalizeDesktopName = (value: unknown): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.slice(0, MAX_DESKTOP_NAME_LENGTH) : "Desktop";
};

/**
 * The node's owner credentials (NA-5, NA-10, NA-11): the launch credential of the desktop that started this node (in
 * memory only, never stored) and the persistent ones desktops got for a setup code. Records are read once and kept in
 * memory; a verification touches no file, and last-seen is written at most once a minute per credential.
 */
export class OwnerCredentialService implements BearerCredentialVerifier, ClientRevocationSource {
  readonly prefix = OWNER_CREDENTIAL_PREFIX;
  private readonly launchCredentialHash: string | null;
  private records: OwnerCredentialRecord[] | null = null;
  private loading: Promise<OwnerCredentialRecord[]> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private readonly events = new EventEmitter();

  constructor(
    private readonly store: OwnerCredentialStore,
    launchCredential: string | null,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.launchCredentialHash = launchCredential ? hashSecret(launchCredential) : null;
  }

  async verify(credential: string): Promise<CredentialVerification> {
    const credentialHash = hashSecret(credential);
    if (this.launchCredentialHash && hashesEqual(this.launchCredentialHash, credentialHash)) {
      return { ok: true, identity: { kind: "owner", credentialId: LAUNCH_CREDENTIAL_ID } };
    }
    const records = await this.loadedRecords();
    const record = records.find((candidate) => hashesEqual(candidate.credentialHash, credentialHash));
    if (!record) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialInvalid };
    }
    this.noteSeen(record.credentialId);
    const identity: ClientIdentity = { kind: "owner", credentialId: record.credentialId };
    return { ok: true, identity };
  }

  /** A new owner credential for a desktop (the setup exchange). The credential is returned once and never stored. */
  async issue(desktopName: unknown): Promise<IssuedOwnerCredential> {
    const credential = generateCredential(OWNER_CREDENTIAL_PREFIX);
    const record: OwnerCredentialRecord = Object.freeze({
      credentialId: generateRecordId("owncred"),
      credentialHash: hashSecret(credential),
      desktopName: normalizeDesktopName(desktopName),
      createdAt: this.now().toISOString(),
      lastSeenAt: null,
    });
    await this.update((records) => [...records, record]);
    return Object.freeze({ credentialId: record.credentialId, credential });
  }

  async list(): Promise<OwnerCredentialSummary[]> {
    return (await this.loadedRecords()).map(toSummary);
  }

  /** Forgets the credential; its next request is refused and its open sockets close (NA-11). */
  async revoke(credentialId: string): Promise<boolean> {
    let removed = false;
    await this.update((records) => records.filter((record) => {
      if (record.credentialId !== credentialId) return true;
      removed = true;
      return false;
    }));
    if (removed) {
      this.publish({ kind: "owner", id: credentialId, refusal: NODE_ACCESS_REFUSALS.credentialRevoked });
    }
    return removed;
  }

  onClientRevoked(listener: ClientRevocationListener): () => void {
    this.events.on("revoked", listener);
    return () => this.events.off("revoked", listener);
  }

  private publish(revocation: ClientRevocation): void {
    this.events.emit("revoked", revocation);
  }

  private async loadedRecords(): Promise<OwnerCredentialRecord[]> {
    if (this.records) return this.records;
    this.loading ??= this.store.read().then((records) => {
      this.records = records;
      return records;
    });
    return this.loading;
  }

  private async update(change: (records: OwnerCredentialRecord[]) => OwnerCredentialRecord[]): Promise<void> {
    const next = this.writes.then(async () => {
      const records = change(await this.loadedRecords());
      await this.store.write(records);
      this.records = records;
    });
    this.writes = next.catch(() => undefined);
    await next;
  }

  private noteSeen(credentialId: string): void {
    const nowDate = this.now();
    const record = this.records?.find((candidate) => candidate.credentialId === credentialId);
    if (!record || (record.lastSeenAt && nowDate.getTime() - Date.parse(record.lastSeenAt) < LAST_SEEN_INTERVAL_MS)) {
      return;
    }
    const lastSeenAt = nowDate.toISOString();
    const markSeen = (records: OwnerCredentialRecord[]) => records.map((candidate) =>
      candidate.credentialId === credentialId ? Object.freeze({ ...candidate, lastSeenAt }) : candidate);
    // In memory at once, so the requests that follow before the write finishes do not write again.
    this.records = markSeen(this.records ?? []);
    void this.update(markSeen).catch((error) => {
      console.warn(`Node access: last-seen of owner credential ${credentialId} was not saved: ${String(error)}`);
    });
  }
}
