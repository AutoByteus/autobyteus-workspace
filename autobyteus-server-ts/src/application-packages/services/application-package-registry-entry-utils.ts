import path from "node:path";
import { BUILT_IN_APPLICATION_PACKAGE_ID } from "../../application-bundles/providers/file-application-bundle-provider.js";
import type {
  ApplicationPackageRegistryDiagnostic,
  ApplicationPackageRegistryEntry,
} from "../domain/application-package-registry-snapshot.js";
import type {
  ApplicationPackageDebugDetails,
  ApplicationPackageListItem,
  ApplicationPackageRecord,
} from "../types.js";
import { buildApplicationPackageSummary, buildLocalApplicationPackageId } from "../utils/application-package-root-summary.js";

export const LOCAL_PATH_SOURCE_KIND = "LOCAL_PATH";
export const GITHUB_SOURCE_KIND = "GITHUB_REPOSITORY";
const PLATFORM_SOURCE_SUMMARY = "Managed by AutoByteus";

const getLocalPackageDisplayName = (rootPath: string): string => {
  const baseName = path.basename(rootPath);
  return baseName || rootPath;
};

const getGitHubPackageDisplayName = (record: ApplicationPackageRecord): string => {
  try {
    const url = new URL(record.source);
    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2);
    if (segments.length === 2) {
      return `${segments[0]}/${segments[1].replace(/\.git$/i, "")}`;
    }
  } catch {
    // Fall back to normalized identity below.
  }

  return record.normalizedSource;
};

export const mapBuiltInPackageEntry = (
  packageRootPath: string,
  bundledSourceRootPath: string,
): ApplicationPackageRegistryEntry => ({
  packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
  displayName: "Platform Applications",
  packageRootPath,
  sourceKind: "BUILT_IN",
  source: bundledSourceRootPath,
  ...buildApplicationPackageSummary(packageRootPath),
  isPlatformOwned: true,
  isRemovable: false,
  managedInstallPath: packageRootPath,
  bundledSourceRootPath,
});

export const mapLocalPackageEntry = (
  packageRootPath: string,
  record?: ApplicationPackageRecord | null,
): ApplicationPackageRegistryEntry => ({
  packageId: record?.packageId ?? buildLocalApplicationPackageId(packageRootPath),
  displayName: getLocalPackageDisplayName(packageRootPath),
  packageRootPath,
  sourceKind: LOCAL_PATH_SOURCE_KIND,
  source: record?.source ?? packageRootPath,
  ...buildApplicationPackageSummary(packageRootPath),
  isPlatformOwned: false,
  isRemovable: true,
  managedInstallPath: null,
  bundledSourceRootPath: null,
});

export const mapGitHubPackageEntry = (
  record: ApplicationPackageRecord,
): ApplicationPackageRegistryEntry => ({
  packageId: record.packageId,
  displayName: getGitHubPackageDisplayName(record),
  packageRootPath: record.rootPath,
  sourceKind: GITHUB_SOURCE_KIND,
  source: record.source,
  ...buildApplicationPackageSummary(record.rootPath),
  isPlatformOwned: false,
  isRemovable: true,
  managedInstallPath: record.managedInstallPath,
  bundledSourceRootPath: null,
});

const buildSourceSummary = (
  record: ApplicationPackageRegistryEntry,
): string | null => {
  switch (record.sourceKind) {
    case "BUILT_IN":
      return PLATFORM_SOURCE_SUMMARY;
    case "LOCAL_PATH":
      return record.packageRootPath;
    case "GITHUB_REPOSITORY":
      return record.source;
    default:
      return null;
  }
};

export const toListItem = (
  record: ApplicationPackageRegistryEntry,
): ApplicationPackageListItem => ({
  packageId: record.packageId,
  displayName: record.displayName,
  sourceKind: record.sourceKind,
  sourceSummary: buildSourceSummary(record),
  applicationCount: record.applicationCount,
  isPlatformOwned: record.isPlatformOwned,
  isRemovable: record.isRemovable,
});

export const toDebugDetails = (
  record: ApplicationPackageRegistryEntry,
): ApplicationPackageDebugDetails => ({
  packageId: record.packageId,
  displayName: record.displayName,
  rootPath: record.packageRootPath,
  sourceKind: record.sourceKind,
  source: record.source,
  sourceSummary: buildSourceSummary(record),
  applicationCount: record.applicationCount,
  isPlatformOwned: record.isPlatformOwned,
  isRemovable: record.isRemovable,
  managedInstallPath: record.managedInstallPath,
  bundledSourceRootPath: record.bundledSourceRootPath,
});

export const createDiagnostic = (
  record: ApplicationPackageRegistryEntry,
  message: string,
  discoveredAt = new Date().toISOString(),
): ApplicationPackageRegistryDiagnostic => ({
  packageId: record.packageId,
  displayName: record.displayName,
  packageRootPath: record.packageRootPath,
  sourceKind: record.sourceKind,
  message,
  discoveredAt,
});
