import path from "node:path";
import type {
  AgentPackage,
  AgentPackageGitHubSourceMetadata,
  AgentPackageRecord,
  AgentPackageSourceMetadata,
  AgentPackageUpdateInfo,
  GitHubRepositoryRevisionMetadata,
} from "../types.js";
import {
  buildGitHubPackageId,
  buildLocalPackageId,
  buildPackageSummary,
  BUILT_IN_AGENT_PACKAGE_ID,
} from "../utils/package-root-summary.js";

const getLocalPackageDisplayName = (rootPath: string): string => {
  const baseName = path.basename(rootPath);
  return baseName || rootPath;
};

const getGitHubPackageDisplayName = (record: AgentPackageRecord): string => {
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

const notApplicableUpdateInfo = (message: string): AgentPackageUpdateInfo => ({
  status: "NOT_APPLICABLE",
  canCheck: false,
  canUpdate: false,
  canReload: false,
  message,
  installedRevision: null,
  latestRevision: null,
  checkedAt: null,
  lastError: null,
});

const localReloadUpdateInfo = (): AgentPackageUpdateInfo => ({
  status: "RELOAD_AVAILABLE",
  canCheck: false,
  canUpdate: false,
  canReload: true,
  message: "Reload after changing this local folder outside AutoByteus.",
  installedRevision: null,
  latestRevision: null,
  checkedAt: null,
  lastError: null,
});

export const githubSourceMetadata = (
  metadata: AgentPackageGitHubSourceMetadata,
): AgentPackageSourceMetadata => ({
  github: metadata,
});

export const buildGitHubSourceMetadata = (input: {
  defaultBranch: string | null;
  installedRevision: string | null;
  latestRevision: string | null;
  latestCheckedAt: string | null;
  updateStatus: AgentPackageGitHubSourceMetadata["updateStatus"];
  lastError?: string | null;
}): AgentPackageGitHubSourceMetadata => ({
  defaultBranch: input.defaultBranch,
  installedRevision: input.installedRevision,
  latestRevision: input.latestRevision,
  latestCheckedAt: input.latestCheckedAt,
  updateStatus: input.updateStatus,
  lastError: input.lastError ?? null,
});

export const buildInstalledGitHubMetadata = (
  metadata: GitHubRepositoryRevisionMetadata,
  checkedAt: string,
): AgentPackageGitHubSourceMetadata =>
  buildGitHubSourceMetadata({
    defaultBranch: metadata.defaultBranch,
    installedRevision: metadata.latestRevision,
    latestRevision: metadata.latestRevision,
    latestCheckedAt: checkedAt,
    updateStatus: "UP_TO_DATE",
  });

const buildGitHubUpdateInfo = (record: AgentPackageRecord): AgentPackageUpdateInfo => {
  const metadata = record.sourceMetadata?.github ?? null;
  const status = metadata?.updateStatus ?? "UNKNOWN";
  const installedRevision = metadata?.installedRevision ?? null;
  const latestRevision = metadata?.latestRevision ?? null;
  const lastError = metadata?.lastError ?? null;

  const canUpdate =
    status === "UPDATE_AVAILABLE" ||
    status === "UPDATE_FAILED" ||
    installedRevision === null;
  const messageByStatus: Record<typeof status, string> = {
    NOT_APPLICABLE: "GitHub update status is not applicable.",
    RELOAD_AVAILABLE: "GitHub package can be refreshed by update check.",
    NOT_CHECKED: "Update status has not been checked yet.",
    UNKNOWN: "Installed revision is unknown. Update to latest to normalize it.",
    UP_TO_DATE: "Up to date.",
    UPDATE_AVAILABLE: "Update available.",
    CHECK_FAILED: lastError
      ? `Update check failed: ${lastError}`
      : "Update check failed.",
    UPDATE_FAILED: lastError ? `Last update failed: ${lastError}` : "Last update failed.",
  };

  return {
    status,
    canCheck: true,
    canUpdate,
    canReload: false,
    message: messageByStatus[status],
    installedRevision,
    latestRevision,
    checkedAt: metadata?.latestCheckedAt ?? null,
    lastError,
  };
};

export const mapBuiltInPackage = (rootPath: string): AgentPackage => ({
  packageId: BUILT_IN_AGENT_PACKAGE_ID,
  displayName: "Built-in Storage",
  path: rootPath,
  sourceKind: "BUILT_IN",
  source: rootPath,
  ...buildPackageSummary(rootPath),
  isDefault: true,
  isRemovable: false,
  managedInstallPath: null,
  updateInfo: notApplicableUpdateInfo("Built-in package is platform managed."),
});

export const mapLocalPackage = (
  rootPath: string,
  record?: AgentPackageRecord | null,
): AgentPackage => ({
  packageId: record?.packageId ?? buildLocalPackageId(rootPath),
  displayName: getLocalPackageDisplayName(rootPath),
  path: rootPath,
  sourceKind: "LOCAL_PATH",
  source: record?.source ?? rootPath,
  ...buildPackageSummary(rootPath),
  isDefault: false,
  isRemovable: true,
  managedInstallPath: null,
  updateInfo: localReloadUpdateInfo(),
});

export const mapGitHubPackage = (record: AgentPackageRecord): AgentPackage => ({
  packageId: record.packageId,
  displayName: getGitHubPackageDisplayName(record),
  path: record.rootPath,
  sourceKind: "GITHUB_REPOSITORY",
  source: record.source,
  ...buildPackageSummary(record.rootPath),
  isDefault: false,
  isRemovable: true,
  managedInstallPath: record.managedInstallPath,
  updateInfo: buildGitHubUpdateInfo(record),
});
