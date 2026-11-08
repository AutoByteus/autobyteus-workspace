import path from "node:path";
import { readJsonArrayFile, writeJsonArrayFile } from "../../persistence/file/store-utils.js";

/** One persistent owner credential: a desktop that connected with a setup code. The node keeps only its hash. */
export type OwnerCredentialRecord = Readonly<{
  credentialId: string;
  credentialHash: string;
  desktopName: string;
  createdAt: string;
  lastSeenAt: string | null;
}>;

type AppDataDirSource = Readonly<{ getAppDataDir(): string }>;

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const parseRecord = (value: unknown): OwnerCredentialRecord | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isString(row.credentialId) || !isString(row.credentialHash) || !isString(row.desktopName) || !isString(row.createdAt)) {
    return null;
  }
  return Object.freeze({
    credentialId: row.credentialId,
    credentialHash: row.credentialHash,
    desktopName: row.desktopName,
    createdAt: row.createdAt,
    lastSeenAt: isString(row.lastSeenAt) ? row.lastSeenAt : null,
  });
};

/**
 * `<data>/node-access/owner-credentials.json`: an array of owner credential rows. A row that cannot be read is left
 * out with a warning naming its position, and every later write keeps it as it was (DESIGN.md rule 7). Only
 * `OwnerCredentialService` uses it.
 */
export class OwnerCredentialStore {
  private unreadableRows: unknown[] = [];

  constructor(private readonly config: AppDataDirSource) {}

  filePath(): string {
    return path.join(this.config.getAppDataDir(), "node-access", "owner-credentials.json");
  }

  async read(): Promise<OwnerCredentialRecord[]> {
    const rows = await readJsonArrayFile<unknown>(this.filePath());
    const records: OwnerCredentialRecord[] = [];
    this.unreadableRows = [];
    rows.forEach((row, index) => {
      const record = parseRecord(row);
      if (record) {
        records.push(record);
        return;
      }
      this.unreadableRows.push(row);
      console.warn(`Node access: owner-credentials.json row ${index} cannot be read and is left out.`);
    });
    return records;
  }

  async write(records: readonly OwnerCredentialRecord[]): Promise<void> {
    await writeJsonArrayFile(this.filePath(), [...records, ...this.unreadableRows]);
  }
}
