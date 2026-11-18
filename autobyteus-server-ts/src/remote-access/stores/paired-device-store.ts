import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonArrayFile, updateJsonArrayFile, writeJsonArrayFile } from "../../persistence/file/store-utils.js";
import { isConnectionWay, type PairedDeviceRecord } from "../domain/models.js";

type AppConfigLike = {
  getAppDataDir(): string;
};

const isValidRecord = (record: PairedDeviceRecord): boolean =>
  Boolean(record?.deviceId)
  && Boolean(record?.displayName)
  && Boolean(record?.credentialHash)
  && Boolean(record?.clientFacingBaseUrl)
  && Boolean(record?.createdAt);

/** Rows written before devices carried their way to connect read as `connectionWay: null`. */
const normalizeRecord = (record: PairedDeviceRecord): PairedDeviceRecord => ({
  ...record,
  connectionWay: isConnectionWay(record.connectionWay) ? record.connectionWay : null,
  lastSeenAt: record.lastSeenAt ?? null,
  revokedAt: record.revokedAt ?? null,
});

export class PairedDeviceStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "remote-access", "paired-devices.json");
  }

  async listRecords(): Promise<PairedDeviceRecord[]> {
    const rows = await readJsonArrayFile<PairedDeviceRecord>(this.getFilePath());
    return rows.filter(isValidRecord).map(normalizeRecord);
  }

  async writeRecords(records: PairedDeviceRecord[]): Promise<void> {
    await writeJsonArrayFile(this.getFilePath(), records);
  }

  async updateRecords(
    updater: (records: PairedDeviceRecord[]) => PairedDeviceRecord[] | Promise<PairedDeviceRecord[]>,
  ): Promise<PairedDeviceRecord[]> {
    return updateJsonArrayFile<PairedDeviceRecord>(this.getFilePath(), async (records) => {
      const normalized = records.filter(isValidRecord).map(normalizeRecord);
      return updater(normalized);
    });
  }
}

let singleton: PairedDeviceStore | null = null;

export const getPairedDeviceStore = (): PairedDeviceStore => {
  singleton ??= new PairedDeviceStore();
  return singleton;
};

export const resetPairedDeviceStoreForTests = (): void => {
  singleton = null;
};
