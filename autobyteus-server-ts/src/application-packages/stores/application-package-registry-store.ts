import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  readJsonArrayFile,
  writeJsonArrayFile,
} from "../../persistence/file/store-utils.js";
import type {
  ApplicationPackageImportSourceKind,
  ApplicationPackageRecord,
} from "../types.js";
import {
  buildGitHubApplicationPackageId,
  buildLocalApplicationPackageId,
} from "../utils/application-package-root-summary.js";

type AppConfigLike = {
  getAppDataDir(): string;
};

type ReadJsonArrayFileLike = <T>(filePath: string) => Promise<T[]>;
type WriteJsonArrayFileLike = <T>(filePath: string, rows: T[]) => Promise<void>;

const normalizeRecord = (record: ApplicationPackageRecord): ApplicationPackageRecord => ({
  ...record,
  rootPath: path.resolve(record.rootPath),
  managedInstallPath: record.managedInstallPath
    ? path.resolve(record.managedInstallPath)
    : null,
  normalizedSource: record.normalizedSource.trim().toLowerCase(),
  sourceKind: record.sourceKind as ApplicationPackageImportSourceKind,
});

const isPersistedSourceKind = (
  value: string,
): value is ApplicationPackageImportSourceKind =>
  value === "LOCAL_PATH" || value === "GITHUB_REPOSITORY";

export class ApplicationPackageRegistryStore {
  constructor(
    private readonly config: AppConfigLike = appConfigProvider.config,
    private readonly readJsonArrayFileImpl: ReadJsonArrayFileLike = readJsonArrayFile,
    private readonly writeJsonArrayFileImpl: WriteJsonArrayFileLike = writeJsonArrayFile,
  ) {}

  getRegistryPath(): string {
    return path.join(
      this.config.getAppDataDir(),
      "application-packages",
      "registry.json",
    );
  }

  async listPackageRecords(): Promise<ApplicationPackageRecord[]> {
    const rows = await this.readJsonArrayFileImpl<ApplicationPackageRecord>(
      this.getRegistryPath(),
    );

    return rows
      .filter(
        (row) =>
          Boolean(row?.packageId) &&
          Boolean(row?.rootPath) &&
          Boolean(row?.normalizedSource) &&
          isPersistedSourceKind(row?.sourceKind),
      )
      .map(normalizeRecord);
  }

  async findPackageById(packageId: string): Promise<ApplicationPackageRecord | null> {
    const rows = await this.listPackageRecords();
    return rows.find((row) => row.packageId === packageId) ?? null;
  }

  async findPackageByRootPath(rootPath: string): Promise<ApplicationPackageRecord | null> {
    const resolved = path.resolve(rootPath);
    const rows = await this.listPackageRecords();
    return rows.find((row) => row.rootPath === resolved) ?? null;
  }

  async findGitHubPackageBySource(
    normalizedSource: string,
  ): Promise<ApplicationPackageRecord | null> {
    const target = normalizedSource.trim().toLowerCase();
    const rows = await this.listPackageRecords();
    return (
      rows.find(
        (row) =>
          row.sourceKind === "GITHUB_REPOSITORY" &&
          row.normalizedSource === target,
      ) ?? null
    );
  }

  async upsertLinkedLocalPackageRecord(
    rootPath: string,
  ): Promise<ApplicationPackageRecord> {
    const resolved = path.resolve(rootPath);
    const now = new Date().toISOString();
    const nextRecord: ApplicationPackageRecord = {
      packageId: buildLocalApplicationPackageId(resolved),
      rootPath: resolved,
      sourceKind: "LOCAL_PATH",
      source: resolved,
      normalizedSource: resolved,
      managedInstallPath: null,
      createdAt: now,
      updatedAt: now,
    };

    return this.upsertRecord(nextRecord, (record) => record.rootPath === resolved);
  }

  async upsertManagedGitHubPackageRecord(input: {
    normalizedSource: string;
    source: string;
    rootPath: string;
    managedInstallPath: string;
  }): Promise<ApplicationPackageRecord> {
    const normalizedSource = input.normalizedSource.trim().toLowerCase();
    const resolvedRootPath = path.resolve(input.rootPath);
    const resolvedManagedInstallPath = path.resolve(input.managedInstallPath);
    const now = new Date().toISOString();

    const nextRecord: ApplicationPackageRecord = {
      packageId: buildGitHubApplicationPackageId(normalizedSource),
      rootPath: resolvedRootPath,
      sourceKind: "GITHUB_REPOSITORY",
      source: input.source,
      normalizedSource,
      managedInstallPath: resolvedManagedInstallPath,
      createdAt: now,
      updatedAt: now,
    };

    return this.upsertRecord(
      nextRecord,
      (record) =>
        record.packageId === nextRecord.packageId ||
        record.normalizedSource === normalizedSource ||
        record.rootPath === resolvedRootPath,
    );
  }

  async removePackageRecord(packageId: string): Promise<void> {
    const rows = await this.listPackageRecords();
    const nextRows = rows.filter((row) => row.packageId !== packageId);

    if (nextRows.length === rows.length) {
      return;
    }

    await this.writeJsonArrayFileImpl(this.getRegistryPath(), nextRows);
  }

  private async upsertRecord(
    nextRecord: ApplicationPackageRecord,
    matcher: (record: ApplicationPackageRecord) => boolean,
  ): Promise<ApplicationPackageRecord> {
    const rows = await this.listPackageRecords();
    const existing = rows.find(matcher);

    const mergedRecord: ApplicationPackageRecord = existing
      ? {
          ...existing,
          ...nextRecord,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        }
      : nextRecord;

    const nextRows = rows.filter((row) => !matcher(row));
    nextRows.push(mergedRecord);

    await this.writeJsonArrayFileImpl(this.getRegistryPath(), nextRows);
    return mergedRecord;
  }
}
