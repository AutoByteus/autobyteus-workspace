import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonArrayFile, updateJsonArrayFile, writeJsonArrayFile } from "../../persistence/file/store-utils.js";
import type { MemoryHubSourceCredentialRecord } from "../shared/memory-sync-types.js";

type AppConfigLike = { getAppDataDir(): string };

const isRecord = (record: MemoryHubSourceCredentialRecord): boolean =>
  Boolean(record?.credentialId)
  && Boolean(record?.credentialHash)
  && Boolean(record?.createdAt);

export class LocalFileMemoryHubCredentialStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "memory-sync", "hub-credentials.json");
  }

  async listRecords(): Promise<MemoryHubSourceCredentialRecord[]> {
    return (await readJsonArrayFile<MemoryHubSourceCredentialRecord>(this.getFilePath()))
      .filter(isRecord)
      .map((record) => ({
        ...record,
        label: record.label ?? null,
        boundSourceNodeId: record.boundSourceNodeId ?? null,
        lastUsedAt: record.lastUsedAt ?? null,
        revokedAt: record.revokedAt ?? null,
      }));
  }

  async writeRecords(records: MemoryHubSourceCredentialRecord[]): Promise<void> {
    await writeJsonArrayFile(this.getFilePath(), records);
  }

  async updateRecords(
    updater: (records: MemoryHubSourceCredentialRecord[]) => MemoryHubSourceCredentialRecord[] | Promise<MemoryHubSourceCredentialRecord[]>,
  ): Promise<MemoryHubSourceCredentialRecord[]> {
    return updateJsonArrayFile<MemoryHubSourceCredentialRecord>(this.getFilePath(), async (records) => {
      const normalized = records.filter(isRecord).map((record) => ({
        ...record,
        label: record.label ?? null,
        boundSourceNodeId: record.boundSourceNodeId ?? null,
        lastUsedAt: record.lastUsedAt ?? null,
        revokedAt: record.revokedAt ?? null,
      }));
      return updater(normalized);
    });
  }
}

let singleton: LocalFileMemoryHubCredentialStore | null = null;

export const getLocalFileMemoryHubCredentialStore = (): LocalFileMemoryHubCredentialStore => {
  singleton ??= new LocalFileMemoryHubCredentialStore();
  return singleton;
};

export const resetLocalFileMemoryHubCredentialStoreForTests = (): void => {
  singleton = null;
};
