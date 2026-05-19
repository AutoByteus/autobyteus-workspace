import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getPairedDeviceStore, type PairedDeviceStore } from "../stores/paired-device-store.js";
import {
  type PairedDeviceRecord,
  type PairedDeviceSummary,
  toDeviceSummary,
} from "../domain/models.js";

const CREDENTIAL_PREFIX = "mra_";

export const hashRemoteAccessCredential = (credential: string): string =>
  createHash("sha256").update(credential, "utf8").digest("hex");

const safeEqualHex = (leftHex: string, rightHex: string): boolean => {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

const normalizeDisplayName = (value: string | null | undefined): string => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "Phone";
};

const generateId = (prefix: string): string => `${prefix}_${randomBytes(16).toString("hex")}`;

const generateCredential = (): string => `${CREDENTIAL_PREFIX}${randomBytes(32).toString("base64url")}`;

export class PairedDeviceService {
  constructor(private readonly store: PairedDeviceStore = getPairedDeviceStore()) {}

  async listDeviceSummaries(): Promise<PairedDeviceSummary[]> {
    return (await this.store.listRecords()).map(toDeviceSummary);
  }

  async createDevice(input: {
    displayName?: string | null;
    clientFacingBaseUrl: string;
  }): Promise<{ record: PairedDeviceRecord; credential: string }> {
    const now = new Date().toISOString();
    const credential = generateCredential();
    const record: PairedDeviceRecord = {
      deviceId: generateId("device"),
      displayName: normalizeDisplayName(input.displayName),
      credentialHash: hashRemoteAccessCredential(credential),
      clientFacingBaseUrl: input.clientFacingBaseUrl,
      createdAt: now,
      lastSeenAt: null,
      revokedAt: null,
    };

    await this.store.updateRecords((records) => [...records, record]);
    return { record, credential };
  }

  async findActiveDeviceByCredential(credential: string): Promise<PairedDeviceRecord | null> {
    const credentialHash = hashRemoteAccessCredential(credential);
    const records = await this.store.listRecords();
    return records.find((record) => safeEqualHex(record.credentialHash, credentialHash)) ?? null;
  }

  async markLastSeen(deviceId: string, now = new Date().toISOString()): Promise<void> {
    await this.store.updateRecords((records) =>
      records.map((record) =>
        record.deviceId === deviceId
          ? { ...record, lastSeenAt: now }
          : record,
      ),
    );
  }

  async revokeDevice(deviceId: string, now = new Date().toISOString()): Promise<PairedDeviceSummary | null> {
    let revoked: PairedDeviceRecord | null = null;
    await this.store.updateRecords((records) =>
      records.map((record) => {
        if (record.deviceId !== deviceId) {
          return record;
        }
        const nextRecord = { ...record, revokedAt: record.revokedAt ?? now };
        revoked = nextRecord;
        return nextRecord;
      }),
    );
    return revoked ? toDeviceSummary(revoked) : null;
  }

  async revokeAllDevices(now = new Date().toISOString()): Promise<{ revokedCount: number }> {
    let revokedCount = 0;
    await this.store.updateRecords((records) =>
      records.map((record) => {
        if (record.revokedAt) {
          return record;
        }
        revokedCount += 1;
        return { ...record, revokedAt: now };
      }),
    );
    return { revokedCount };
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
