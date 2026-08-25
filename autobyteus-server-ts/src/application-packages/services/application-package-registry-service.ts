import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type {
  ApplicationPackageRegistryDiagnostic,
  ApplicationPackageRegistryEntry,
  ApplicationPackageRegistrySnapshot,
} from "../domain/application-package-registry-snapshot.js";
import type { BuiltInApplicationPackageMaterializer } from "./built-in-application-package-materializer.js";
import {
  GITHUB_SOURCE_KIND,
  LOCAL_PATH_SOURCE_KIND,
  createDiagnostic,
  mapBuiltInPackageEntry,
  mapGitHubPackageEntry,
  mapLocalPackageEntry,
  toDebugDetails,
  toListItem,
} from "./application-package-registry-entry-utils.js";
import { ApplicationPackageRegistryStore } from "../stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../stores/application-package-root-settings-store.js";
import type {
  ApplicationPackageDebugDetails,
  ApplicationPackageListItem,
  ApplicationPackageRecord,
} from "../types.js";

type BuiltInMaterializerLike = Pick<
  BuiltInApplicationPackageMaterializer,
  "ensureMaterialized" | "getBundledSourceRootPath"
>;

export class ApplicationPackageRegistryService {
  private readonly rootSettingsStore: ApplicationPackageRootSettingsStore;
  private readonly registryStore: ApplicationPackageRegistryStore;
  private readonly builtInMaterializer: BuiltInMaterializerLike;

  constructor(dependencies: {
    rootSettingsStore: ApplicationPackageRootSettingsStore;
    registryStore: ApplicationPackageRegistryStore;
    builtInMaterializer: BuiltInMaterializerLike;
  }) {
    this.rootSettingsStore = dependencies.rootSettingsStore;
    this.registryStore = dependencies.registryStore;
    this.builtInMaterializer = dependencies.builtInMaterializer;
  }

  async getRegistrySnapshot(): Promise<ApplicationPackageRegistrySnapshot> {
    await this.builtInMaterializer.ensureMaterialized();
    const builtInRootPath = path.resolve(this.rootSettingsStore.getBuiltInRootPath());
    const bundledSourceRootPath = path.resolve(
      this.builtInMaterializer.getBundledSourceRootPath(),
    );
    const additionalRootPaths = this.rootSettingsStore
      .listAdditionalRootPaths().map((rootPath) => path.resolve(rootPath));
    const records = await this.registryStore.listPackageRecords();
    const recordByRootPath = new Map(
      records.map((record) => [path.resolve(record.rootPath), record]),
    );
    const additionalRootSet = new Set(additionalRootPaths);
    const packages: ApplicationPackageRegistryEntry[] = [
      mapBuiltInPackageEntry(builtInRootPath, bundledSourceRootPath),
    ];
    const diagnostics: ApplicationPackageRegistryDiagnostic[] = [];

    for (const additionalRootPath of additionalRootPaths) {
      const record = recordByRootPath.get(additionalRootPath);
      const entry = record?.sourceKind === GITHUB_SOURCE_KIND
        ? mapGitHubPackageEntry(record)
        : mapLocalPackageEntry(additionalRootPath, record);
      packages.push(entry);
      diagnostics.push(...await this.collectEntryDiagnostics(entry, record, true));
    }
    for (const record of records) {
      const rootPath = path.resolve(record.rootPath);
      if (additionalRootSet.has(rootPath)) {
        continue;
      }
      const entry = record.sourceKind === GITHUB_SOURCE_KIND
        ? mapGitHubPackageEntry(record)
        : mapLocalPackageEntry(rootPath, record);
      packages.push(entry);
      diagnostics.push(createDiagnostic(
        entry,
        "Application package registry/settings mismatch: package root is registered in the registry but not present in configured roots.",
      ));
      diagnostics.push(...await this.collectEntryDiagnostics(entry, record, false));
    }
    return {
      packages: this.sortRegistryEntries(packages),
      diagnostics: this.sortDiagnostics(diagnostics),
      refreshedAt: new Date().toISOString(),
    };
  }

  async listApplicationPackages(): Promise<ApplicationPackageListItem[]> {
    const snapshot = await this.getRegistrySnapshot();
    return snapshot.packages
      .filter((record) => !record.isPlatformOwned || record.applicationCount > 0)
      .map(toListItem);
  }

  async getApplicationPackageDetails(
    packageId: string,
  ): Promise<ApplicationPackageDebugDetails | null> {
    const target = await this.findRegistryEntryById(packageId.trim());
    return target ? toDebugDetails(target) : null;
  }

  async findRegistryEntryById(
    packageId: string,
  ): Promise<ApplicationPackageRegistryEntry | null> {
    const snapshot = await this.getRegistrySnapshot();
    return snapshot.packages.find((entry) => entry.packageId === packageId) ?? null;
  }

  getBuiltInRootPath(): string {
    return path.resolve(this.rootSettingsStore.getBuiltInRootPath());
  }

  getBundledSourceRootPath(): string {
    return path.resolve(this.builtInMaterializer.getBundledSourceRootPath());
  }

  listAdditionalRootPaths(): string[] {
    return this.rootSettingsStore.listAdditionalRootPaths().map((rootPath) => path.resolve(rootPath));
  }

  addAdditionalRootPath(rootPath: string): void {
    this.rootSettingsStore.addAdditionalRootPath(rootPath);
  }

  removeAdditionalRootPath(rootPath: string): void {
    this.rootSettingsStore.removeAdditionalRootPath(rootPath);
  }

  ensureBuiltInMaterialized(): Promise<void> {
    return this.builtInMaterializer.ensureMaterialized();
  }

  findPackageRecord(packageId: string): Promise<ApplicationPackageRecord | null> {
    return this.registryStore.findPackageById(packageId);
  }

  findGitHubPackageBySource(source: string): Promise<ApplicationPackageRecord | null> {
    return this.registryStore.findGitHubPackageBySource(source);
  }

  upsertLinkedLocalPackage(rootPath: string): Promise<ApplicationPackageRecord> {
    return this.registryStore.upsertLinkedLocalPackageRecord(rootPath);
  }

  upsertManagedGitHubPackage(input: {
    normalizedSource: string;
    source: string;
    rootPath: string;
    managedInstallPath: string;
  }): Promise<ApplicationPackageRecord> {
    return this.registryStore.upsertManagedGitHubPackageRecord(input);
  }

  async removePackageRecord(packageId: string): Promise<void> {
    await this.registryStore.removePackageRecord(packageId);
  }

  async restorePackageRecord(record: ApplicationPackageRecord | null): Promise<void> {
    if (!record) {
      return;
    }
    if (record.sourceKind === LOCAL_PATH_SOURCE_KIND) {
      await this.registryStore.upsertLinkedLocalPackageRecord(record.rootPath);
      return;
    }
    await this.registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: record.normalizedSource,
      source: record.source,
      rootPath: record.rootPath,
      managedInstallPath: record.managedInstallPath ?? record.rootPath,
    });
  }

  private async collectEntryDiagnostics(
    record: ApplicationPackageRegistryEntry,
    registryRecord: ApplicationPackageRecord | undefined,
    presentInSettings: boolean,
  ): Promise<ApplicationPackageRegistryDiagnostic[]> {
    const diagnostics: ApplicationPackageRegistryDiagnostic[] = [];
    if (!record.isPlatformOwned && presentInSettings && !registryRecord) {
      diagnostics.push(createDiagnostic(
        record,
        "Application package registry/settings mismatch: package root is configured but no registry record exists.",
      ));
    }
    try {
      const stats = await fsPromises.stat(record.packageRootPath);
      if (!stats.isDirectory()) {
        diagnostics.push(createDiagnostic(
          record,
          `Application package root is not a directory: ${record.packageRootPath}`,
        ));
      } else {
        await fsPromises.access(record.packageRootPath, fs.constants.R_OK);
      }
    } catch (error) {
      diagnostics.push(createDiagnostic(
        record,
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? `Application package root is missing: ${record.packageRootPath}`
          : `Application package root is unreadable: ${record.packageRootPath}`,
      ));
    }
    if (registryRecord?.sourceKind === GITHUB_SOURCE_KIND) {
      if (!registryRecord.managedInstallPath) {
        diagnostics.push(createDiagnostic(
          record,
          "GitHub application package registry record is missing managedInstallPath.",
        ));
      } else if (
        path.resolve(registryRecord.managedInstallPath) !== record.packageRootPath
      ) {
        diagnostics.push(createDiagnostic(
          record,
          "GitHub application package registry/settings mismatch: managed install path does not match the configured package root.",
        ));
      }
    }
    return diagnostics;
  }

  private sortRegistryEntries(
    packages: ApplicationPackageRegistryEntry[],
  ): ApplicationPackageRegistryEntry[] {
    return [...packages].sort((left, right) => {
      if (left.isPlatformOwned) return -1;
      if (right.isPlatformOwned) return 1;
      return left.displayName.localeCompare(right.displayName)
        || left.packageRootPath.localeCompare(right.packageRootPath);
    });
  }

  private sortDiagnostics(
    diagnostics: ApplicationPackageRegistryDiagnostic[],
  ): ApplicationPackageRegistryDiagnostic[] {
    return [...diagnostics].sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.message.localeCompare(right.message));
  }
}
