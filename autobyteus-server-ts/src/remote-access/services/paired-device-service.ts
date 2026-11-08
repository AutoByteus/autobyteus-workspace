import { EventEmitter } from "node:events";
import {
  generateCredential,
  generateRecordId,
  hashSecret,
  hashesEqual,
} from "../../node-access/domain/credential-secret.js";
import { NODE_ACCESS_REFUSALS } from "../../node-access/domain/node-access-refusal.js";
import type { ClientRevocationListener } from "../../node-access/domain/credential-verification.js";
import { getPairedDeviceStore, type PairedDeviceStore } from "../stores/paired-device-store.js";
import {
  REMOTE_ACCESS_MOBILE_CREDENTIAL_PREFIX,
  type ConnectionWay,
  type PairedDeviceRecord,
  type PairedDeviceSummary,
  toDeviceSummary,
} from "../domain/models.js";

const LAST_SEEN_INTERVAL_MS = 60_000;

const normalizeDisplayName = (value: string | null | undefined): string => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "Phone";
};

/**
 * The node's paired phones. `paired-devices.json` is read once and kept in memory; the service's own writes update
 * both, so a phone request touches no file (QR-002) and last-seen is written at most once a minute per phone.
 * A revocation is published after its write, so the gate closes that phone's open sockets (NA-11).
 */
export class PairedDeviceService {
  private records: PairedDeviceRecord[] | null = null;
  private loading: Promise<PairedDeviceRecord[]> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private readonly events = new EventEmitter();

  constructor(private readonly store: PairedDeviceStore = getPairedDeviceStore()) {}

  async listActiveDeviceSummaries(): Promise<PairedDeviceSummary[]> {
    return (await this.loadedRecords())
      .filter((record) => !record.revokedAt)
      .map(toDeviceSummary);
  }

  async listRevokedDeviceSummaries(): Promise<PairedDeviceSummary[]> {
    return (await this.loadedRecords())
      .filter((record) => Boolean(record.revokedAt))
      .map(toDeviceSummary);
  }

  async createDevice(input: {
    displayName?: string | null;
    clientFacingBaseUrl: string;
    connectionWay: ConnectionWay;
  }): Promise<{ record: PairedDeviceRecord; credential: string }> {
    const now = new Date().toISOString();
    const credential = generateCredential(REMOTE_ACCESS_MOBILE_CREDENTIAL_PREFIX);
    const record: PairedDeviceRecord = {
      deviceId: generateRecordId("device"),
      displayName: normalizeDisplayName(input.displayName),
      credentialHash: hashSecret(credential),
      clientFacingBaseUrl: input.clientFacingBaseUrl,
      connectionWay: input.connectionWay,
      createdAt: now,
      lastSeenAt: null,
      revokedAt: null,
    };

    await this.update((records) => [...records, record]);
    return { record, credential };
  }

  async findDeviceByCredential(credential: string): Promise<PairedDeviceRecord | null> {
    const credentialHash = hashSecret(credential);
    const records = await this.loadedRecords();
    return records.find((record) => hashesEqual(record.credentialHash, credentialHash)) ?? null;
  }

  /** Records that the phone was seen, at most once a minute (in memory at once, on disk in the background). */
  markLastSeen(deviceId: string, now = new Date()): void {
    const record = this.records?.find((candidate) => candidate.deviceId === deviceId);
    if (!record || (record.lastSeenAt && now.getTime() - Date.parse(record.lastSeenAt) < LAST_SEEN_INTERVAL_MS)) {
      return;
    }
    const lastSeenAt = now.toISOString();
    const markSeen = (records: PairedDeviceRecord[]) =>
      records.map((candidate) => (candidate.deviceId === deviceId ? { ...candidate, lastSeenAt } : candidate));
    this.records = markSeen(this.records ?? []);
    void this.update(markSeen).catch((error) => {
      console.warn(`Remote Access: last-seen of paired device ${deviceId} was not saved: ${String(error)}`);
    });
  }

  async revokeDevice(deviceId: string, now = new Date().toISOString()): Promise<PairedDeviceSummary | null> {
    let revoked: PairedDeviceRecord | null = null;
    await this.update((records) =>
      records.map((record) => {
        if (record.deviceId !== deviceId) {
          return record;
        }
        const nextRecord = { ...record, revokedAt: record.revokedAt ?? now };
        revoked = nextRecord;
        return nextRecord;
      }),
    );
    if (!revoked) return null;
    this.events.emit("revoked", { kind: "phone", id: deviceId, refusal: NODE_ACCESS_REFUSALS.deviceRevoked });
    return toDeviceSummary(revoked);
  }

  async revokeAllDevices(now = new Date().toISOString()): Promise<{ revokedCount: number }> {
    const revokedIds: string[] = [];
    await this.update((records) =>
      records.map((record) => {
        if (record.revokedAt) {
          return record;
        }
        revokedIds.push(record.deviceId);
        return { ...record, revokedAt: now };
      }),
    );
    revokedIds.forEach((id) => this.events.emit("revoked", { kind: "phone", id, refusal: NODE_ACCESS_REFUSALS.deviceRevoked }));
    return { revokedCount: revokedIds.length };
  }

  onClientRevoked(listener: ClientRevocationListener): () => void {
    this.events.on("revoked", listener);
    return () => this.events.off("revoked", listener);
  }

  private async loadedRecords(): Promise<PairedDeviceRecord[]> {
    if (this.records) return this.records;
    this.loading ??= this.store.listRecords().then((records) => {
      this.records = records;
      return records;
    });
    return this.loading;
  }

  private async update(change: (records: PairedDeviceRecord[]) => PairedDeviceRecord[]): Promise<void> {
    const next = this.writes.then(async () => {
      const records = change(await this.loadedRecords());
      await this.store.writeRecords(records);
      this.records = records;
    });
    this.writes = next.catch(() => undefined);
    await next;
  }
}

let singleton: PairedDeviceService | null = null;

export const getPairedDeviceService = (): PairedDeviceService => {
  singleton ??= new PairedDeviceService();
  return singleton;
};

export const resetPairedDeviceServiceForTests = (): void => {
  singleton = null;
};
